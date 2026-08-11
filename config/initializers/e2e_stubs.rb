# Stubs de red SOLO para la suite E2E de Playwright (paquete 12, tareas 8 a 11).
#
# POR QUE ESTE ARCHIVO EXISTE Y NO SE USA page.route():
# las llamadas a la fuente de TRM y al modelo de vision las hace RAILS, en el
# proceso del webServer, no el navegador. `page.route()` solo intercepta trafico
# del navegador, asi que es incapaz de tocarlas. WebMock tampoco sirve (ademas
# de estar prohibido por la convencion 6 del paquete 01): parchea el proceso de
# Minitest, no un Puma separado.
#
# QUE SE REEMPLAZA: UNICAMENTE el borde de red de cada servicio
# (`ExchangeRateService.fetch_remote` y `ReceiptExtractionService.call_vision_model`).
# Todo lo demas —controller, strong params, transaccion, evaluate!, persistencia,
# serializer, React— corre de verdad. Un stub del servicio entero haria verde un
# E2E que no prueba nada.
#
# DOBLE GUARDA: entorno de test Y flag explicito. Si el flag esta puesto fuera de
# test, el boot ABORTA a proposito.
if ENV["E2E_STUBS"] == "1"
  raise "E2E_STUBS=1 fuera de RAILS_ENV=test" unless Rails.env.test?

  module E2eStubs
    # Bitacora de llamadas: una linea JSON por llamada. Es la prueba VERIFICABLE
    # de que no salio trafico externo; los specs de Playwright la leen con
    # test/e2e/support/stubs.js.
    LOG = Rails.root.join("tmp", "e2e", "stub_calls.log")

    # Fixtures que el stub de extraccion reconoce. Se identifican por el DIGESTO
    # de su contenido y no por el nombre del archivo, porque el `payload` que
    # arma ReceiptExtractionService#payload_for NO lleva el nombre original
    # (verificado: solo model, max_tokens, system, output_config y messages con
    # el bloque base64). Es la unica desviacion respecto de la tabla de la
    # Tarea 11 del plan, y conserva la propiedad que si es innegociable: el stub
    # sigue siendo una FUNCION PURA de sus argumentos.
    FIXTURES = Rails.root.join("test", "fixtures", "files")

    # GUARDA DE REENTRADA. El `prepend` sobre el singleton_class es
    # IRREVERSIBLE: una vez hecho, el modulo gana sobre cualquier metodo definido
    # en el singleton class, INCLUIDO el que escribe `Minitest::Mock#stub`. Sin
    # esta guarda, `test/models/e2e_stubs_test.rb` —que carga este archivo a
    # proposito— dejaria inertes los ~10 `ExchangeRateService.stub(:fetch_remote)`
    # de `test/services/exchange_rate_service_test.rb` segun el orden aleatorio
    # de Minitest: un fallo intermitente carisimo de diagnosticar.
    #
    # No contradice la regla "el stub es funcion pura de sus argumentos" (Tarea 9,
    # punto 2): la variable no elige RESPUESTA, solo enciende o apaga el stub
    # entero, igual que la guarda de carga del archivo. En la corrida E2E la
    # variable esta puesta en el proceso del webServer, asi que siempre esta on.
    def self.activo? = ENV["E2E_STUBS"] == "1"

    def self.record!(service, method, args, result_kind)
      FileUtils.mkdir_p(LOG.dirname)
      File.open(LOG, "a") do |f|
        f.puts({ at: Time.current.iso8601, service: service, method: method,
                 args: args, result: result_kind }.to_json)
      end
    end

    # Digesto de una fixture, memoizado. Si el archivo no existe devuelve nil y
    # el stub cae al camino "documento ilegible", que es lo correcto: nunca
    # inventa datos.
    def self.digest_de(nombre)
      @digestos ||= {}
      return @digestos[nombre] if @digestos.key?(nombre)

      ruta = FIXTURES.join(nombre)
      @digestos[nombre] = ruta.exist? ? Digest::SHA256.hexdigest(ruta.binread) : nil
    end

    # Digesto de los bytes que viajan dentro del payload (base64 estricto).
    def self.digest_del_payload(payload)
      bloque = payload.to_h.dig(:messages, 0, :content, 0)
      datos  = bloque.is_a?(Hash) ? bloque.dig(:source, :data) : nil
      return nil if datos.blank?

      Digest::SHA256.hexdigest(Base64.decode64(datos))
    end
  end

  # --- TRM y tasas de cambio -------------------------------------------------
  #
  # Firma canonica de 00-ARQUITECTURA 6.7 (seam de red del paquete 05) y MISMO
  # tipo de retorno que el metodo real: ExchangeRateService::Result cuyo value es
  # { quote: ExchangeRateClient::Quote, source: }. Si el 05 cambia la firma, este
  # archivo revienta en boot: es intencional.
  #
  # El stub es funcion pura de (currency, date). Cero variables de entorno para
  # elegir respuesta, cero contadores, cero orden de llamada: cambiar de payload
  # no puede exigir reiniciar el webServer (con cache_classes = true eso cuesta
  # minuto y medio por corrida).
  module E2eStubs::ExchangeRate
    # (moneda, fecha) => [tasa, fuente, fecha efectiva]
    TABLA = {
      ["USD", "2026-06-15"] => ["4321.500000", "trm_oficial", "2026-06-15"], # lunes
      ["USD", "2026-06-13"] => ["4310.000000", "trm_oficial", "2026-06-12"], # sabado -> viernes
      ["EUR", "2026-06-15"] => ["4680.250000", "bce",         "2026-06-15"]
    }.freeze

    def fetch_remote(currency:, date:)
      return super unless E2eStubs.activo?

      code = Currency.normalize(currency)
      d    = date.to_date

      # COP no consulta a nadie y NO se registra en el log: el servicio real
      # tampoco sale a la red para la moneda base.
      if code == Currency::DEFAULT
        return ExchangeRateService::Result.new(
          ok: true, errors: [],
          value: { quote: ExchangeRateClient::Quote.new(rate: BigDecimal("1"), effective_date: d,
                                                        valid_until: d),
                   source: "identity" }
        )
      end

      fila = TABLA[[code, d.iso8601]]
      args = { currency: code, date: d.iso8601 }

      if fila.nil?
        # Nunca se inventa un numero. El servicio real traduce esto a
        # "Ingrésela manualmente", que es el camino de captura a mano.
        E2eStubs.record!("ExchangeRateService", "fetch_remote", args, "sin_tasa")
        return ExchangeRateService::Result.new(ok: false, value: nil, errors: ["sin_tasa"])
      end

      tasa, fuente, efectiva = fila
      E2eStubs.record!("ExchangeRateService", "fetch_remote", args, fuente)

      ExchangeRateService::Result.new(
        ok: true, errors: [],
        value: { quote: ExchangeRateClient::Quote.new(rate: BigDecimal(tasa),
                                                      effective_date: Date.parse(efectiva),
                                                      valid_until: d),
                 source: fuente }
      )
    end
  end
  ExchangeRateService.singleton_class.prepend(E2eStubs::ExchangeRate)

  # --- Extraccion de comprobantes por IA -------------------------------------
  #
  # Firma canonica de 00-ARQUITECTURA 6.7 (seam de red del paquete 10): UN
  # argumento posicional. Devuelve el Hash CRUDO del modelo; el parseo, el armado
  # de `fields`, las `confidence`, las `warnings` y el motor de reglas siguen
  # siendo codigo real.
  module E2eStubs::ReceiptExtraction
    # El caso USD NO trae los valores en COP: los calcula el servicio real
    # (invariante 3 de la arquitectura). Si el stub los devolviera, el escenario
    # 5 dejaria de probar la conversion.
    FELIZ_COP = {
      "is_invoice" => true, "unreadable" => false,
      "provider_name" => "HOTEL DANN CARLTON E2E", "identification" => "900123456",
      "invoice_number" => "FE-E2E-IA-001", "invoice_date" => "2026-06-15",
      "currency" => "COP", "value" => 250_000.0, "tax" => 47_500.0, "total" => 297_500.0,
      "description" => "Alojamiento de comision E2E",
      "confidence" => { "provider_name" => 0.97, "identification" => 0.55,
                        "invoice_number" => 0.94, "invoice_date" => 0.71,
                        "currency" => 0.99, "value" => 0.95, "tax" => 0.93, "total" => 0.96 }
    }.freeze

    FELIZ_USD = FELIZ_COP.merge(
      "currency" => "USD", "value" => 120.0, "tax" => 22.8, "total" => 142.8
    ).freeze

    def call_vision_model(payload)
      return super unless E2eStubs.activo?

      digesto = E2eStubs.digest_del_payload(payload)

      respuesta, clase =
        case digesto
        when E2eStubs.digest_de("comprobante_ia.jpg")     then [FELIZ_COP, "feliz_cop"]
        when E2eStubs.digest_de("comprobante_ia_usd.pdf") then [FELIZ_USD, "feliz_usd"]
        else
          # comprobante_ilegible.png y cualquier otro archivo: hash vacio. El
          # servicio real lo traduce a "No se pudo leer el comprobante. Complete
          # los datos manualmente".
          [{}, "ilegible"]
        end

      E2eStubs.record!("ReceiptExtractionService", "call_vision_model",
                       { digest: digesto, fixture: clase }, clase)
      respuesta
    end
  end
  ReceiptExtractionService.singleton_class.prepend(E2eStubs::ReceiptExtraction)

  # --- Testigo para el globalSetup -------------------------------------------
  #
  # Mitigacion del riesgo 1 del paquete: con `reuseExistingServer: true`,
  # Playwright puede reutilizar un `rails s -e test` que el desarrollador ya
  # tenia levantado SIN E2E_STUBS, y la suite saldria a internet de verdad. El
  # global-setup hace GET / y aborta si esta cabecera no viene en "on".
  #
  # La guarda de `initialized?` es obligatoria: la pila de middleware se congela
  # al terminar el boot, y `test/models/e2e_stubs_test.rb` vuelve a cargar este
  # archivo con la aplicacion ya levantada. Sin ella, los 11 casos de ese archivo
  # mueren con FrozenError.
  unless Rails.application.initialized?
    Rails.application.config.middleware.insert_before(
      0, Class.new do
        def initialize(app) = @app = app

        def call(env)
          status, headers, body = @app.call(env)
          headers["X-E2E-Stubs"] = "on"
          [status, headers, body]
        end
      end
    )
  end

  # --- Meta csrf-token en el layout ------------------------------------------
  #
  # DEFECTO DE ENTORNO, REAL Y BLOQUEANTE, encontrado al correr los E2E:
  # `config.action_controller.allow_forgery_protection = false` (test.rb) hace
  # que `csrf_meta_tags` devuelva NIL, asi que el layout no emite
  # <meta name="csrf-token">. Y `components/Shifts/Calendar.jsx:15` —que se monta
  # dentro de la pantalla del centro de costos— hace
  # `document.querySelector("[name='csrf-token']").content` SIN guarda de nil.
  # Resultado: TypeError en el constructor, React 16 desmonta el arbol entero y
  # /cost_centers/:id queda en blanco. Los escenarios 1, 2, 3, 4 y 9 corren todos
  # sobre esa pantalla.
  #
  # En produccion y en desarrollo el meta existe, asi que el defecto NO se ve
  # fuera de test: por eso la verificacion manual del paquete 08, hecha contra el
  # servidor de desarrollo, no lo detecto.
  #
  # Se emite el meta y NADA MAS: la verificacion de CSRF sigue apagada. Encender
  # `allow_forgery_protection` cambiaria el comportamiento de toda la suite
  # (`page.request.*` sin token pasaria a 422) y es una decision que no le toca a
  # este paquete. Con esto el navegador recibe exactamente lo que recibe en
  # produccion —incluido el token que todos los `fetch` mandan en X-CSRF-Token— y
  # el arreglo no toca ni un archivo de app/.
  ActionView::Base.prepend(Module.new do
    def csrf_meta_tags
      super || safe_join(
        [tag("meta", name: "csrf-param", content: request_forgery_protection_token),
         tag("meta", name: "csrf-token", content: form_authenticity_token)],
        "\n"
      )
    end
  end)

  Rails.logger.warn("[E2E] Stubs de IA y TRM ACTIVOS. Ninguna llamada externa saldra.")
end

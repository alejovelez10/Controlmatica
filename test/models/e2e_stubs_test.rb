require "test_helper"
# Object#stub viene de minitest/mock, que ya esta dentro de minitest: no es una
# gema nueva. rails/test_help no lo carga solo y test_helper.rb es del paquete 01.
require "minitest/mock"

# Contrato entre el stub de E2E y el servicio real.
#
# ES EL TEST MAS VALIOSO DEL PAQUETE 12: un stub que se desincroniza del servicio
# real produce una suite E2E verde que no prueba nada. Aqui se comprueba que el
# stub conserva la firma, el tipo de retorno y el contrato de error de los dos
# metodos que reemplaza.
#
# ┌─ POR QUE EL COMPORTAMIENTO SE PRUEBA EN UN SUBPROCESO ────────────────────┐
# │ El plan pedia `load` del initializer dentro de este archivo. Se hizo, y   │
# │ ROMPIO la suite entera de forma intermitente: `SystemStackError` en       │
# │ exchange_rate_service_test.rb segun el orden aleatorio de Minitest.        │
# │                                                                           │
# │ La causa, verificada: el initializer hace `prepend` sobre el              │
# │ singleton_class, que es IRREVERSIBLE. Cuando despues otro archivo hace    │
# │ `ExchangeRateService.stub(:fetch_remote, ...)`, Minitest guarda el metodo │
# │ con `alias_method` y lo restaura al salir del bloque; esa restauracion    │
# │ COPIA el metodo del modulo prependido DENTRO del singleton_class, y su    │
# │ `super` pasa a encontrarse a si mismo. Recursion infinita.                │
# │                                                                           │
# │ Por eso el prepend no se ejecuta nunca en este proceso: las guardas se    │
# │ prueban aqui (ninguna de las dos llega a prependir) y el comportamiento   │
# │ se prueba lanzando UN `bin/rails runner` con E2E_STUBS=1, que es          │
# │ exactamente como corre el webServer de Playwright. El subprocesso se      │
# │ ejecuta una sola vez para todo el archivo.                                │
# └───────────────────────────────────────────────────────────────────────────┘
class E2eStubsTest < ActiveSupport::TestCase
  INITIALIZER = Rails.root.join("config", "initializers", "e2e_stubs.rb")

  # Sonda que corre DENTRO de un proceso con los stubs activos y devuelve un
  # informe JSON. Todo lo que este archivo afirma sobre comportamiento sale de
  # aqui.
  SONDA = <<~'RUBY'.freeze
    require "json"

    def payload_de(nombre)
      bytes = Rails.root.join("test", "fixtures", "files", nombre).binread
      { model: "modelo-de-prueba", max_tokens: 2048, system: "…",
        messages: [{ role: "user",
                     content: [{ type: "image",
                                 source: { type: "base64", media_type: "image/jpeg",
                                           data: Base64.strict_encode64(bytes) } },
                               { type: "text", text: "Extrae los datos de este comprobante." }] }] }
    end

    FileUtils.rm_f(E2eStubs::LOG)

    lunes  = ExchangeRateService.fetch_remote(currency: "USD", date: Date.new(2026, 6, 15))
    sabado = ExchangeRateService.fetch_remote(currency: "USD", date: Date.new(2026, 6, 13))
    euro   = ExchangeRateService.fetch_remote(currency: "EUR", date: Date.new(2026, 6, 15))
    vacio  = ExchangeRateService.fetch_remote(currency: "USD", date: Date.new(2026, 1, 1))
    lineas_antes_de_cop = File.exist?(E2eStubs::LOG) ? File.readlines(E2eStubs::LOG).size : 0
    ExchangeRateService.fetch_remote(currency: "COP", date: Date.new(2026, 6, 15))
    lineas_despues_de_cop = File.exist?(E2eStubs::LOG) ? File.readlines(E2eStubs::LOG).size : 0

    feliz    = ReceiptExtractionService.call_vision_model(payload_de("comprobante_ia.jpg"))
    feliz_usd = ReceiptExtractionService.call_vision_model(payload_de("comprobante_ia_usd.pdf"))
    desconocido = ReceiptExtractionService.call_vision_model(payload_de("comprobante.png"))

    ultima = JSON.parse(File.readlines(E2eStubs::LOG).last)

    informe = {
      prependido: ExchangeRateService.singleton_class.ancestors.map(&:to_s).grep(/E2eStubs/).size,
      parametros: ExchangeRateService.method(:fetch_remote).parameters.map { |p| p.map(&:to_s) },
      clase_result: lunes.class.to_s,
      responde_a: %i[ok? value errors].map { |m| lunes.respond_to?(m) },
      lunes: { ok: lunes.ok?, clase_quote: lunes.value[:quote].class.to_s,
               rate: lunes.value[:quote].rate.to_s, source: lunes.value[:source] },
      sabado: { ok: sabado.ok?, rate: sabado.value[:quote].rate.to_s,
                efectiva: sabado.value[:quote].effective_date.to_s },
      euro: { ok: euro.ok?, source: euro.value[:source] },
      vacio: { ok: vacio.ok?, errors: vacio.errors, value_nil: vacio.value.nil? },
      cop: { antes: lineas_antes_de_cop, despues: lineas_despues_de_cop },
      extraccion: { feliz: feliz, feliz_usd: feliz_usd, desconocido: desconocido },
      ultima_linea: ultima,
      claves_confianza: ReceiptExtractionService::CONFIDENCE_KEYS.sort
    }

    puts "===INFORME==="
    puts informe.to_json
  RUBY

  # Una sola vez para todo el archivo: arrancar Rails cuesta ~6 s.
  def self.informe
    @informe ||= begin
      salida = IO.popen(
        { "RAILS_ENV" => "test", "E2E_STUBS" => "1", "DISABLE_SPRING" => "1" },
        ["bin/rails", "runner", SONDA],
        chdir: Rails.root.to_s, err: [:child, :out]
      ) { |io| io.read }

      json = salida[/===INFORME===\n(.*)/m, 1]
      raise "la sonda de stubs no produjo informe:\n#{salida}" if json.nil?

      JSON.parse(json)
    end
  end

  def informe = self.class.informe

  test "el initializer de stubs aborta si E2E_STUBS esta activo fuera de test" do
    con_flag do
      Rails.stub(:env, ActiveSupport::StringInquirer.new("production")) do
        error = assert_raises(RuntimeError) { load INITIALIZER }
        assert_equal "E2E_STUBS=1 fuera de RAILS_ENV=test", error.message
      end
    end
  end

  test "el initializer de stubs no se carga sin el flag" do
    antes = ExchangeRateService.singleton_class.ancestors.map(&:to_s).count { |m| m.include?("E2eStubs") }
    assert_equal 0, antes, "sin E2E_STUBS el stub no puede existir en este proceso"

    load INITIALIZER

    despues = ExchangeRateService.singleton_class.ancestors.map(&:to_s).count { |m| m.include?("E2eStubs") }
    assert_equal 0, despues, "cargar el archivo sin flag no puede tocar el servicio"
  end

  test "con el flag activo el stub queda prependido en el proceso del webServer" do
    assert_equal 1, informe["prependido"],
                 "en la corrida E2E el modulo tiene que estar en la cadena de ExchangeRateService"
  end

  test "el stub de tasas conserva la firma del metodo real" do
    assert_equal [%w[keyreq currency], %w[keyreq date]], informe["parametros"],
                 "si Multimoneda cambia la firma, este stub deja de ser valido"
    # Y la firma del metodo REAL, en este proceso sin stubs, es la misma.
    assert_equal [%i[keyreq currency], %i[keyreq date]],
                 ExchangeRateService.method(:fetch_remote).parameters
  end

  test "el stub de tasas devuelve el mismo tipo de Result que el real" do
    assert_equal "ExchangeRateService::Result", informe["clase_result"]
    assert_equal [true, true, true], informe["responde_a"]
    assert_equal "ExchangeRateClient::Quote", informe["lunes"]["clase_quote"]
    assert_equal "trm_oficial", informe["lunes"]["source"]
    assert_equal BigDecimal("4321.5"), BigDecimal(informe["lunes"]["rate"])
    assert_equal "bce", informe["euro"]["source"]
  end

  test "el stub de tasas devuelve el habil anterior para un sabado" do
    assert informe["sabado"]["ok"]
    assert_equal "2026-06-12", informe["sabado"]["efectiva"]
    assert_equal BigDecimal("4310.0"), BigDecimal(informe["sabado"]["rate"])
  end

  test "el stub de tasas falla sin excepcion para una fecha sin tasa" do
    refute informe["vacio"]["ok"]
    assert_equal ["sin_tasa"], informe["vacio"]["errors"]
    assert informe["vacio"]["value_nil"]
  end

  test "el stub registra las llamadas y COP no consulta nada" do
    assert_equal informe["cop"]["antes"], informe["cop"]["despues"],
                 "COP no puede escribir una linea: el servicio real tampoco sale a la red"

    assert_equal "ReceiptExtractionService", informe["ultima_linea"]["service"]
    assert_equal "call_vision_model", informe["ultima_linea"]["method"]
  end

  test "el stub de extraccion devuelve el hash crudo del modelo para el comprobante conocido" do
    feliz = informe["extraccion"]["feliz"]

    assert_equal "HOTEL DANN CARLTON E2E", feliz["provider_name"]
    assert_equal "FE-E2E-IA-001", feliz["invoice_number"]
    assert_equal "COP", feliz["currency"]
    # Las claves de confianza son EXACTAMENTE las que el servicio real normaliza.
    assert_equal informe["claves_confianza"], feliz["confidence"].keys.sort
  end

  test "el stub de extraccion no escribe los COP del caso USD: los calcula el servicio real" do
    usd = informe["extraccion"]["feliz_usd"]

    assert_equal "USD", usd["currency"]
    assert_equal 120.0, usd["value"]
    assert_equal 22.8, usd["tax"]
  end

  test "el stub de extraccion devuelve vacio para un archivo desconocido y no lanza" do
    assert_equal({}, informe["extraccion"]["desconocido"],
                 "el servicio real traduce un crudo vacio a 'No se pudo leer el comprobante'")
  end

  private

  def con_flag
    previo = ENV["E2E_STUBS"]
    ENV["E2E_STUBS"] = "1"
    yield
  ensure
    ENV["E2E_STUBS"] = previo
    ENV.delete("E2E_STUBS") if previo.nil?
  end
end

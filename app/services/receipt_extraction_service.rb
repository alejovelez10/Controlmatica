# Extraccion asistida de comprobantes: recibe una imagen o un PDF de una factura
# y devuelve los campos estructurados para PRE-LLENAR el formulario de gasto.
# Nunca guarda nada y nunca puede impedir el registro manual (00-ARQUITECTURA
# Bloque D.1 y riesgo 12 del paquete 10): si esto falla, el usuario digita.
#
# ============ ESTADO: ESQUELETO COMPLETO. FALTA UNA SOLA COSA ============
# Ya esta implementado y probado todo el contrato: validacion de entrada,
# normalizacion del archivo, armado del payload, JSON Schema de salida, umbrales
# de confianza, normalizacion de los campos leidos, mapeo de errores y Result.
#
# Lo UNICO que falta es `self.call_vision_model(payload)` (mas abajo), que es la
# unica pieza del sistema que le habla a un modelo de vision.
#
# **Lo implementa el agente de Taimes**, por decision del cliente del 2026-08-10
# (docs/plan-gastos-ia/ESTADO.md, seccion "Frontera de alcance": todo lo que
# hable con un modelo de IA es de Taimes). Aqui se le deja el hueco exacto:
# rellenar un metodo con una firma fija, no rediseñar el servicio.
#
# Mientras ese metodo no exista, el flag RECEIPT_EXTRACTION_ENABLED **arranca
# apagado** y el servicio responde `:disabled` / `:not_configured` sin reventar.
#
# Tampoco existen todavia, y quedan solo DECLARADOS aqui:
#   - el endpoint `POST /extract_receipt/report_expenses` (accion
#     `ReportExpensesController#extract_receipt`, contrato D.1);
#   - el boton "Leer comprobante" del formulario de gasto (paquete 08).
# Se construyen cuando la extraccion exista; sin ella no tendrian nada que
# orquestar.
# ========================================================================
class ReceiptExtractionService
  # 🟡 UNICA EXCEPCION DOCUMENTADA al Result canonico del proyecto
  # (00-ARQUITECTURA 4.2, cerrado en la reauditoria). Aqui `:error` es SINGULAR
  # a proposito: es un CODIGO (:timeout, :unsupported_format, :too_large...) que
  # el llamador mapea, no un mensaje; el mensaje va aparte en `:error_message`.
  # Su unico consumidor es la accion `extract_receipt`, que la escribe este
  # mismo paquete. Fuera de aqui, un `result.error` singular sigue siendo señal
  # de desvio: el resto del proyecto usa `ok/value/errors` con errors ARRAY.
  Result = Struct.new(:ok, :fields, :confidence, :error, :error_message, :model, :usage,
                      keyword_init: true) do
    def ok?    = !!ok
    def error? = !ok

    # Verdadero para los dos codigos que significan "esto no esta puesto a
    # punto todavia": falta la llave o el kill switch esta apagado. Se distingue
    # `:disabled` de `:not_configured` porque el operador necesita saber cual de
    # los dos es (uno se arregla sembrando una variable, el otro encendiendo el
    # flag), pero para el llamador ambos son el mismo caso: no hay extraccion y
    # no se gasto ni un token.
    def not_configured? = NOT_CONFIGURED_ERRORS.include?(error)
  end

  # Codigos que significan "sin configurar". Ver Result#not_configured?.
  NOT_CONFIGURED_ERRORS = %i[not_configured disabled].freeze

  MAX_BYTES             = 5.megabytes
  SUPPORTED_IMAGE_TYPES = %w[image/jpeg image/png image/webp image/gif].freeze
  SUPPORTED_PDF_TYPE    = "application/pdf"
  SUPPORTED_TYPES       = (SUPPORTED_IMAGE_TYPES + [SUPPORTED_PDF_TYPE]).freeze

  # Sobreescribible por RECEIPT_EXTRACTION_MODEL para poder cambiar de modelo (o
  # bajar de costo) sin desplegar codigo. Es decision del cliente, no del
  # implementador, y por eso es ENV y no constante.
  DEFAULT_MODEL = "claude-opus-5".freeze

  # Umbrales de confianza AUTO-REPORTADA por el modelo (riesgo 5 del paquete):
  # un 0.94 no es "94% de probabilidad de estar bien". Por eso el umbral de
  # anulacion es conservador: mejor un campo vacio que un dato inventado.
  CONFIDENCE_DROP = 0.30 # por debajo: se anula el valor
  CONFIDENCE_WARN = 0.60 # por debajo: se conserva pero se marca como dudoso

  # Las 9 claves de datos que devuelve el modelo. `fields` siempre trae estas 9
  # mas `:low_confidence`, incluso cuando la extraccion fallo (valor nil).
  FIELD_KEYS = %w[provider_name identification invoice_number invoice_date
                  currency value tax total description].freeze

  # Los 8 campos que llevan confianza por campo (description no la lleva: es
  # texto libre que el usuario reescribe de todas formas).
  CONFIDENCE_KEYS = %w[provider_name identification invoice_number invoice_date
                       currency value tax total].freeze

  # Todos los mensajes terminan en "Complete los datos manualmente": el contrato
  # D.1 exige que el usuario SIEMPRE sepa que puede seguir sin la IA.
  ERROR_MESSAGES = {
    not_configured:     "La lectura automatica de comprobantes no esta configurada. Complete los datos manualmente",
    disabled:           "La lectura automatica de comprobantes esta deshabilitada. Complete los datos manualmente",
    unsupported_format: "El formato del archivo no se puede leer automaticamente. Adjunte un JPG, PNG o PDF, o complete los datos manualmente",
    too_large:          "El archivo supera los 5 MB permitidos para lectura automatica. Complete los datos manualmente",
    unreadable:         "No se pudo leer el comprobante. Complete los datos manualmente",
    not_an_invoice:     "El archivo adjunto no parece ser una factura o comprobante. Complete los datos manualmente",
    timeout:            "La lectura del comprobante tardo demasiado. Complete los datos manualmente",
    refusal:            "No se pudo procesar el comprobante. Complete los datos manualmente",
    provider_error:     "No se pudo leer el comprobante. Complete los datos manualmente"
  }.freeze

  # SALIDA ESTRUCTURADA, no texto libre: el modelo responde contra este JSON
  # Schema. Sin esto habria que parsear prosa, que es donde se rompen estas
  # integraciones.
  SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: %w[is_invoice unreadable provider_name identification invoice_number invoice_date
                 currency value tax total description confidence],
    properties: {
      is_invoice:     { type: "boolean" },
      unreadable:     { type: "boolean" },
      provider_name:  { type: %w[string null] },
      identification: { type: %w[string null] },
      invoice_number: { type: %w[string null] },
      invoice_date:   { type: %w[string null] },  # YYYY-MM-DD
      currency:       { type: %w[string null] },  # ISO 4217, 3 letras
      value:          { type: %w[number null] },  # base gravable, en la moneda del documento
      tax:            { type: %w[number null] },
      total:          { type: %w[number null] },
      description:    { type: %w[string null] },
      confidence: {
        type: "object",
        additionalProperties: false,
        required: CONFIDENCE_KEYS,
        properties: CONFIDENCE_KEYS.index_with { { type: "number" } }
      }
    }
  }.freeze

  SYSTEM_PROMPT = <<~PROMPT.freeze
    Eres un extractor de datos de comprobantes de gasto para una empresa colombiana.
    Lees una imagen o un PDF de una factura, recibo, tiquete o cuenta de cobro y devuelves
    UNICAMENTE los campos que puedes leer en el documento.

    Reglas estrictas:
    - Nunca inventes un dato. Si un campo no aparece o no lo puedes leer con seguridad, devuelvelo en null.
    - identification es el NIT o la cedula de QUIEN EMITE el comprobante (el proveedor), no la del cliente.
    - invoice_date en formato YYYY-MM-DD. Si el documento usa DD/MM/AAAA, conviertelo. Ante ambiguedad
      entre DD/MM y MM/DD, asume DD/MM (formato colombiano).
    - value es la base gravable (sin impuestos), tax es el total de impuestos, total es el valor a pagar.
      Los tres en la moneda del documento, sin simbolos ni separadores de miles.
    - currency es el codigo ISO 4217 de 3 letras. Si el documento no indica moneda, asume COP.
    - description es una frase corta (maximo 120 caracteres) de que se compro.
    - is_invoice en false si el archivo no es un comprobante de gasto.
    - unreadable en true si el documento esta demasiado borroso, cortado u oscuro para leerlo.
    - confidence: un numero entre 0 y 1 por campo, que refleje que tan seguro estas de HABER LEIDO
      ese valor en el documento. 0 para los campos que devolviste en null.
  PROMPT

  # Punto de entrada unico. NUNCA lanza una excepcion: siempre devuelve Result.
  def self.extract(file, context = {}) = new(file, context).call

  # Kill switch de produccion (00-ARQUITECTURA 7.9).
  #
  # DESVIACION DELIBERADA del valor por defecto que traia el plan ("true"):
  # arranca APAGADO porque el seam `call_vision_model` todavia no existe y
  # encenderlo por omision solo produciria errores. Cuando Taimes complete la
  # extraccion, se enciende con RECEIPT_EXTRACTION_ENABLED=true.
  def self.enabled? = ENV.fetch("RECEIPT_EXTRACTION_ENABLED", "false").to_s.strip.casecmp("true").zero?

  def self.configured? = ENV["ANTHROPIC_API_KEY"].present?

  def self.model = ENV["RECEIPT_EXTRACTION_MODEL"].presence || DEFAULT_MODEL

  # ==========================================================================
  # SEAM DE RED CANONICO (00-ARQUITECTURA 6.7, vinculante).
  # Unico metodo de todo el servicio que puede abrir un socket.
  # Publico a proposito: los tests lo reemplazan con
  # `ReceiptExtractionService.stub(:call_vision_model, ...)` y el initializer de
  # E2E del paquete 12 le hace `prepend`. NO recibe el cliente por parametro.
  #
  # ---------------- ESTO ES LO UNICO QUE FALTA DEL PAQUETE ------------------
  # LO IMPLEMENTA EL AGENTE DE TAIMES. Nadie mas debe tocarlo: es la frontera de
  # alcance acordada con el cliente (ESTADO.md, "Frontera de alcance").
  #
  # CONTRATO QUE DEBE CUMPLIR LA IMPLEMENTACION, sin margen:
  #   1. Recibe `payload`, que ya viene armado (los kwargs de messages.create:
  #      :model, :max_tokens, :system, :output_config con el JSON Schema de
  #      arriba, y :messages con el bloque document/image en base64 estricto).
  #   2. Construye el cliente con `timeout: 18` y `max_retries: 0` en un metodo
  #      de clase PRIVADO (no otro seam). max_retries: 0 no es negociable: con
  #      el default (2) un timeout deja un hilo de Puma bloqueado 54 s y Puma
  #      tiene 5 hilos. Prohibido `Timeout.timeout` (interrumpe el hilo en un
  #      punto arbitrario y puede dejar la conexion de AR inconsistente).
  #   3. Devuelve UNA de estas tres cosas:
  #      - el Hash CRUDO del modelo, ya parseado con JSON.parse, opcionalmente
  #        con la clave "_usage" de metadatos;
  #      - el simbolo :refusal si `stop_reason == "refusal"`;
  #      - nil si la respuesta no trajo bloque de texto.
  #   4. Puede lanzar: `call` de aqui rescata todo y lo mapea a un codigo de
  #      error. No rescatar dentro del seam ni reintentar.
  #
  # EJEMPLO EXACTO del Hash que debe devolver (camino feliz):
  #
  #   {
  #     "is_invoice"     => true,
  #     "unreadable"     => false,
  #     "provider_name"  => "Distribuidora El Sol SAS",
  #     "identification" => "900.123.456-7",
  #     "invoice_number" => "FE-4821",
  #     "invoice_date"   => "2026-07-14",
  #     "currency"       => "COP",
  #     "value"          => 420168.0,
  #     "tax"            => 79831.92,
  #     "total"          => 500000.0,
  #     "description"    => "Papeleria y utiles de oficina",
  #     "confidence"     => {
  #       "provider_name"  => 0.96, "identification" => 0.93,
  #       "invoice_number" => 0.90, "invoice_date"   => 0.98,
  #       "currency"       => 0.99, "value"          => 0.95,
  #       "tax"            => 0.91, "total"          => 0.97
  #     },
  #     "_usage" => { input_tokens: 1834, output_tokens: 212 }
  #   }
  #
  # Implementacion de referencia (pseudocodigo del plan, paquete 10 tarea 7):
  #
  #   resp = vision_client.messages.create(**payload)
  #   return :refusal if resp.stop_reason.to_s == "refusal"
  #   text = Array(resp.content).find { |b| b.type.to_s == "text" }&.text
  #   return nil if text.blank?
  #   JSON.parse(text).merge("_usage" => { input_tokens:  resp.usage&.input_tokens,
  #                                        output_tokens: resp.usage&.output_tokens })
  #
  # Antes de escribirlo hay que verificar la firma real de `Anthropic::Client.new`
  # y de `client.messages.create` contra el SDK instalado y agregar
  # `gem "anthropic"` al Gemfile con la version pineada: el gem NO esta instalado
  # todavia, justamente porque nada de aqui abre una conexion.
  # ==========================================================================
  def self.call_vision_model(_payload)
    raise NotImplementedError,
          "ReceiptExtractionService.call_vision_model lo implementa el agente de Taimes: debe " \
          "devolver el Hash crudo del modelo (JSON.parse del bloque de texto, con \"_usage\" " \
          "opcional), :refusal si stop_reason == \"refusal\", o nil si no vino bloque de texto."
  end

  def initialize(file, context = {})
    @file    = file
    @context = (context || {}).to_h.symbolize_keys
  end

  # Orden de corte deliberado: los dos primeros pasos cortan antes de tocar el
  # archivo, y los tres siguientes antes de gastar un solo token.
  def call
    return failure(:disabled)       unless self.class.enabled?
    return failure(:not_configured) unless self.class.configured?

    source = build_source
    return failure(source) if source.is_a?(Symbol)

    raw = self.class.call_vision_model(payload_for(source))
    return failure(:refusal)        if raw == :refusal
    return failure(:provider_error) if raw.blank?

    parse(raw)
  rescue NotImplementedError => e
    # El seam todavia no existe (lo implementa Taimes). Se responde como "sin
    # configurar" en vez de propagar: el contrato D.1 dice que extraer NUNCA
    # puede tumbar el registro manual de un gasto. Queda en el log para que
    # quien encienda el flag sin la implementacion sepa por que no funciona.
    Rails.logger.error("[ReceiptExtractionService] seam sin implementar: #{e.message}")
    failure(:not_configured)
  rescue StandardError => e
    # Se loguea la clase y el mensaje, NUNCA el payload ni el cliente: ahi va la
    # imagen del comprobante y la ANTHROPIC_API_KEY (riesgo 13 del paquete).
    Rails.logger.error("[ReceiptExtractionService] #{e.class}: #{e.message}")
    failure(error_code_for(e))
  end

  private

  # Normaliza cualquier entrada razonable a { data: <base64>, media_type:, filename: }
  # o devuelve un SIMBOLO con el codigo de error. Acepta lo que responda a #read
  # (ActionDispatch::Http::UploadedFile, Rack::Test::UploadedFile, un uploader de
  # CarrierWave) o un Hash { data:, media_type:, filename: } con los bytes crudos.
  #
  # La extraccion opera sobre los bytes EN MEMORIA: no necesita que el
  # comprobante este guardado en S3.
  def build_source
    bytes, declared_type, filename = read_file
    return :unsupported_format if bytes.blank?
    return :too_large          if bytes.bytesize > MAX_BYTES

    media_type = resolve_media_type(declared_type, filename)
    return :unsupported_format unless SUPPORTED_TYPES.include?(media_type)

    # strict_encode64 es OBLIGATORIO: encode64 mete un \n cada 60 caracteres y
    # la API rechaza el payload con un 400 que no explica nada.
    { data: Base64.strict_encode64(bytes), media_type: media_type, filename: filename }
  end

  def read_file
    return [nil, nil, nil] if @file.nil?

    if @file.is_a?(Hash)
      h = @file.symbolize_keys
      return [h[:data].to_s.b, h[:media_type], h[:filename]]
    end

    return [nil, nil, nil] unless @file.respond_to?(:read)

    @file.rewind if @file.respond_to?(:rewind)
    [@file.read.to_s.b, declared_content_type, declared_filename]
  end

  def declared_content_type
    @file.content_type if @file.respond_to?(:content_type)
  end

  def declared_filename
    return @file.original_filename if @file.respond_to?(:original_filename)
    return @file.filename          if @file.respond_to?(:filename)

    @file.path if @file.respond_to?(:path)
  end

  # El navegador miente: sube "application/octet-stream" a menudo, y por WhatsApp
  # puede no venir content-type. Cuando pasa, se deduce de la extension.
  #
  # HEIC cae aqui y se rechaza a proposito: la API de vision solo acepta
  # jpeg/png/webp/gif, y convertirlo exigiria ImageMagick en el camino critico
  # (00-ARQUITECTURA 4.8 decidio no meterlo). El .heic SI se puede adjuntar al
  # gasto; lo unico que no se hace es leerlo automaticamente.
  def resolve_media_type(declared, filename)
    tipo = declared.to_s.split(";").first.to_s.strip.downcase
    return tipo if SUPPORTED_TYPES.include?(tipo)

    ext = File.extname(filename.to_s).downcase
    return tipo if ext.blank?

    Rack::Mime.mime_type(ext, tipo.presence).to_s.split(";").first.to_s.strip.downcase
  end

  def payload_for(source)
    {
      model: self.class.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      # effort "low": leer campos de una factura no exige razonamiento profundo
      # y el presupuesto de latencia del contrato D.1 es de 20 s. No se pasa
      # thinking: { type: "disabled" }: tiene modos de falla conocidos y bajar
      # el effort ya da el ahorro.
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: [document_block(source), { type: "text", text: user_hint }] }]
    }
  end

  def document_block(source)
    tipo = source[:media_type] == SUPPORTED_PDF_TYPE ? "document" : "image"
    { type: tipo,
      source: { type: "base64", media_type: source[:media_type], data: source[:data] } }
  end

  def user_hint
    code = @context[:cost_center_code].presence
    return "Extrae los datos de este comprobante." if code.nil?

    "Extrae los datos de este comprobante. El gasto se imputa al centro de costos #{code}."
  end

  # ---- post-proceso de la respuesta del modelo -------------------------------

  def parse(raw)
    data = raw.respond_to?(:deep_stringify_keys) ? raw.deep_stringify_keys : raw.to_h.deep_stringify_keys

    return failure(:unreadable)     if flag_true?(data["unreadable"])
    return failure(:not_an_invoice) if data.key?("is_invoice") && !flag_true?(data["is_invoice"])

    confidence = normalize_confidence(data["confidence"])
    fields     = build_fields(data, confidence)

    Result.new(ok: true, fields: fields, confidence: confidence, error: nil, error_message: nil,
               model: self.class.model, usage: data["_usage"])
  end

  def normalize_confidence(raw)
    h = raw.is_a?(Hash) ? raw.deep_stringify_keys : {}

    CONFIDENCE_KEYS.each_with_object({}) do |key, acc|
      valor = h[key]
      acc[key] = valor.to_f if valor.is_a?(Numeric)
    end
  end

  def build_fields(data, confidence)
    low    = []
    campos = {}

    FIELD_KEYS.each do |key|
      valor = data[key]
      conf  = confidence[key]

      if conf.present? && conf < CONFIDENCE_DROP
        valor = nil          # mejor vacio que inventado
        low << key
      elsif conf.present? && conf < CONFIDENCE_WARN
        low << key           # se conserva, pero el formulario lo resalta
      end

      campos[key.to_sym] = valor
    end

    normalize_fields(campos, low)
    campos[:low_confidence] = low.uniq
    campos
  end

  def normalize_fields(campos, low)
    campos[:provider_name]  = campos[:provider_name].presence&.to_s&.strip
    campos[:description]    = campos[:description].presence&.to_s&.strip
    campos[:invoice_number] = campos[:invoice_number].presence&.to_s&.strip
    campos[:identification] = solo_digitos(campos[:identification])
    campos[:invoice_date]   = a_fecha(campos[:invoice_date])
    campos[:currency]       = normalize_currency(campos[:currency], low)

    campos[:value] = a_monto(campos[:value])
    campos[:tax]   = a_monto(campos[:tax])
    campos[:total] = a_monto(campos[:total])

    completar_totales(campos)
  end

  # Una moneda que no esta en el catalogo no se propaga: se fuerza a COP y se
  # marca como dudosa, para que la persona la corrija. Devolver "XYZ" haria que
  # la conversion posterior fallara con un error incomprensible.
  def normalize_currency(valor, low)
    code = Currency.normalize(valor)
    return code if Currency.valid?(code)

    low << "currency"
    Currency::DEFAULT
  end

  # Aritmetica solo hacia arriba: nunca se deduce un valor que pueda salir
  # negativo por restar mal. Si el resultado no es positivo, se deja nil.
  def completar_totales(campos)
    if campos[:total].nil? && campos[:value].present? && campos[:tax].present?
      campos[:total] = campos[:value] + campos[:tax]
    elsif campos[:value].nil? && campos[:total].present? && campos[:tax].present?
      diferencia = campos[:total] - campos[:tax]
      campos[:value] = diferencia if diferencia >= 0
    end
  end

  def solo_digitos(valor)
    return nil if valor.blank?

    valor.to_s.gsub(/[^0-9]/, "").presence
  end

  def a_fecha(valor)
    return nil if valor.blank?
    return valor if valor.is_a?(Date)

    Date.parse(valor.to_s)
  rescue ArgumentError, TypeError, Date::Error
    nil
  end

  # BigDecimal, no Float: son importes contables. Los negativos se descartan (un
  # comprobante de gasto no tiene valores negativos; si los tiene, que los digite
  # una persona).
  def a_monto(valor)
    return nil if valor.nil?

    monto = BigDecimal(valor.to_s)
    monto.negative? ? nil : monto
  rescue ArgumentError, TypeError
    nil
  end

  def flag_true?(valor) = [true, "true", "1", 1].include?(valor)

  # El mapeo se hace por NOMBRE de clase, no por constante: el SDK de Anthropic
  # todavia no esta instalado (lo instala Taimes con el seam) y referenciar
  # `Anthropic::Errors::APIConnectionError` aqui reventaria con NameError, que es
  # exactamente lo contrario de lo que promete este servicio.
  TIMEOUT_ERROR_NAMES = %w[
    Anthropic::Errors::APIConnectionError
    Anthropic::Errors::APITimeoutError
    Net::OpenTimeout
    Net::ReadTimeout
    Timeout::Error
  ].freeze

  def error_code_for(exception)
    nombres = exception.class.ancestors.grep(Class).filter_map(&:name)
    return :timeout if nombres.intersect?(TIMEOUT_ERROR_NAMES)

    :provider_error
  end

  # `fields` trae SIEMPRE las 10 claves, tambien cuando falla: el frontend las
  # lee sin preguntar y un nil es mas facil de pintar que una clave ausente.
  def failure(code)
    Result.new(ok: false, fields: empty_fields, confidence: {}, error: code,
               error_message: ERROR_MESSAGES.fetch(code, ERROR_MESSAGES[:provider_error]),
               model: self.class.model, usage: nil)
  end

  def empty_fields
    FIELD_KEYS.index_with { nil }.symbolize_keys.merge(low_confidence: [])
  end
end

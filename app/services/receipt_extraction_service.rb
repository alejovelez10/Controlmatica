# Extraccion asistida de comprobantes: recibe una imagen o un PDF de una factura
# y devuelve los campos estructurados para PRE-LLENAR el formulario de gasto.
# Nunca guarda nada y nunca puede impedir el registro manual (00-ARQUITECTURA
# Bloque D.1 y riesgo 12 del paquete 10): si esto falla, el usuario digita.
#
# ============ ESTADO: COMPLETO — LA EXTRACCION CORRE EN TAIMES ============
# El contrato interno no cambio: validacion de entrada, normalizacion del
# archivo, armado del payload, JSON Schema de salida, umbrales de confianza,
# normalizacion de los campos leidos, mapeo de errores y Result son los mismos.
#
# `call_vision_model` esta implementado (2026-08-17): sube el comprobante a un
# S3 temporal, genera una URL firmada y se la manda al agente "Extractor de
# Comprobantes" de Taimes por el endpoint invoke. Ver el bloque del seam.
#
# Config: TAIMES_INVOKE_URL + TAIMES_AGENT_ID + TAIMES_API_KEY (sin ellas el
# servicio responde `:not_configured`) y el kill switch
# RECEIPT_EXTRACTION_ENABLED. La ruta `POST /extract_receipt/report_expenses`
# (accion `ReportExpensesController#extract_receipt`, contrato D.1) es quien
# orquesta esto desde el formulario de gasto.
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

  MAX_BYTES             = 20.megabytes
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
    too_large:          "El archivo supera los 20 MB permitidos para lectura automatica. Complete los datos manualmente",
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

  # Las tres variables que apuntan al agente extractor de Taimes:
  #   TAIMES_INVOKE_URL: base del gateway (sgi), p.ej. https://taimes.example.com
  #   TAIMES_AGENT_ID:   uuid del agente "Extractor de Comprobantes"
  #   TAIMES_API_KEY:    API key del tenant Controlmatica (kmz_...)
  TAIMES_ENV_KEYS = %w[TAIMES_INVOKE_URL TAIMES_AGENT_ID TAIMES_API_KEY].freeze

  def self.configured? = TAIMES_ENV_KEYS.all? { |clave| ENV[clave].present? }

  # Solo informativo desde que la extraccion corre en Taimes: viaja en el payload
  # y en Result.model para trazabilidad, pero el modelo real lo decide el agente.
  def self.model = ENV["RECEIPT_EXTRACTION_MODEL"].presence || DEFAULT_MODEL

  # ==========================================================================
  # SEAM DE RED CANONICO (00-ARQUITECTURA 6.7, vinculante).
  # Unico metodo de todo el servicio que puede abrir un socket.
  # Publico a proposito: los tests lo reemplazan con
  # `ReceiptExtractionService.stub(:call_vision_model, ...)` y el initializer de
  # E2E del paquete 12 le hace `prepend`. NO recibe el cliente por parametro.
  #
  # ---------------- IMPLEMENTADO: LA EXTRACCION CORRE EN TAIMES -------------
  # Decision del usuario (2026-08-17): en vez del SDK de Anthropic, el seam le
  # habla al agente "Extractor de Comprobantes" de Taimes por el endpoint invoke
  # (POST {TAIMES_INVOKE_URL}/api/public/agents/{TAIMES_AGENT_ID}/invoke, header
  # X-API-Key con la key kmz_ del tenant). El agente descarga el comprobante con
  # su tool read_url desde una URL firmada de S3 y responde {resumen, datos,
  # uso} con las claves del SCHEMA dentro de `datos`.
  #
  # El payload Anthropic-shaped que arma `payload_for` SE CONSERVA como interfaz
  # interna (los tests de contrato y el digesto del stub E2E dependen de su
  # forma); de el se extraen los bytes del documento y el hint del usuario.
  #
  # CONTRATO DE RETORNO (intacto respecto del plan original):
  #   - el Hash CRUDO con las claves del SCHEMA, opcionalmente con "_usage";
  #   - nil si Taimes no devolvio `datos` utilizables;
  #   - puede lanzar: `call` rescata todo y lo mapea (Net::OpenTimeout /
  #     Net::ReadTimeout -> :timeout; TaimesError y el resto -> :provider_error).
  #   El simbolo :refusal sigue siendo un retorno valido del contrato, pero esta
  #   implementacion no lo produce: un rechazo del agente llega como `datos`
  #   vacio y termina en :provider_error.
  #
  # PRESUPUESTO DE TIEMPO: open 2 s + read 16 s = 18 s, el mismo techo del plan
  # original (D.1 da 20 s totales y Puma tiene 5 hilos: no subirlo). Cero
  # reintentos y prohibido `Timeout.timeout`, igual que siempre.
  #
  # El objeto S3 temporal (uploads/tmp/extract/<uuid>/...) se borra en el ensure
  # best-effort; la red de seguridad es la regla de lifecycle de 1 dia sobre el
  # prefijo uploads/tmp/ (runbook de despliegue).
  # ==========================================================================
  class TaimesError < StandardError; end

  TMP_PREFIX          = "uploads/tmp/extract".freeze
  TMP_URL_TTL_SECONDS = 600
  INVOKE_OPEN_TIMEOUT = 2
  INVOKE_READ_TIMEOUT = 16

  EXTENSION_POR_TIPO = {
    "image/jpeg" => ".jpg", "image/png" => ".png", "image/webp" => ".webp",
    "image/gif" => ".gif", SUPPORTED_PDF_TYPE => ".pdf"
  }.freeze

  def self.call_vision_model(payload)
    source = document_source_from(payload)
    raise TaimesError, "payload sin bloque de documento" if source.nil?
    raise TaimesError, "almacenamiento S3 sin configurar (AWS_BUCKET)" if ENV["AWS_BUCKET"].blank?

    s3  = s3_connection
    key = upload_temp_object(s3, source)
    begin
      url = presign_get(s3, key)
      parse_invoke_response(taimes_invoke(
        input: invoke_input(payload, url),
        context: invoke_context(source),
        # El JSON Schema del payload viaja al invoke: Taimes lo usa como
        # output_type TIPADO (sin él, el modelo colapsa el dict libre — llegó a
        # devolver la matriz de confianzas COMO datos, 2026-08-18).
        esquema: payload.to_h.dig(:output_config, :format, :schema)
      ))
    ensure
      delete_temp_object(s3, key)
    end
  end

  # Inversa exacta de `document_block`: bytes y media_type del payload, o nil.
  def self.document_source_from(payload)
    bloque = payload.to_h.dig(:messages, 0, :content, 0)
    fuente = bloque.is_a?(Hash) ? bloque[:source] : nil
    return nil unless fuente.is_a?(Hash) && fuente[:data].present?

    { bytes: Base64.strict_decode64(fuente[:data]), media_type: fuente[:media_type].to_s }
  end
  private_class_method :document_source_from

  # Timeouts cortos y UN solo intento (hallazgo del review 2026-08-17):
  # fog-aws marca put_object/delete_object como idempotentes y con los defaults
  # de Excon (connect/read/write 60 s x retry_limit 5) una degradacion de S3
  # retendria un hilo de Puma VARIOS MINUTOS — con 5 hilos, cinco clicks en
  # "Extraer" congelan la app entera, incluido el registro manual que D.1
  # promete no bloquear. El comprobante pesa <=20 MB: si S3 no responde en
  # segundos, se aborta y la persona captura a mano.
  S3_CONNECTION_OPTIONS = {
    connect_timeout: 2, read_timeout: 5, write_timeout: 5,
    retry_limit: 1, retry_interval: 0
  }.freeze

  # Mismo patron que Mcp::S3DirectUpload.connection: no se memoiza entre
  # requests (un socket muerto de Puma falla al primer uso); dentro de UNA
  # llamada al seam si se reusa la misma conexion.
  def self.s3_connection
    Fog::Storage.new(
      CarrierWave::Uploader::Base.fog_credentials.merge(connection_options: S3_CONNECTION_OPTIONS)
    )
  end
  private_class_method :s3_connection

  def self.upload_temp_object(s3, source)
    extension = EXTENSION_POR_TIPO.fetch(source[:media_type], "")
    key = "#{TMP_PREFIX}/#{SecureRandom.uuid}/comprobante#{extension}"
    s3.put_object(ENV["AWS_BUCKET"], key, source[:bytes], "Content-Type" => source[:media_type])
    key
  end
  private_class_method :upload_temp_object

  # Firmar es local: no abre socket.
  def self.presign_get(s3, key)
    s3.get_object_url(ENV["AWS_BUCKET"], key, (Time.now + TMP_URL_TTL_SECONDS).to_i)
  end
  private_class_method :presign_get

  # Best effort: un temporal huerfano (lo barre la regla de lifecycle) es
  # preferible a convertir en error una extraccion que si funciono.
  def self.delete_temp_object(s3, key)
    s3.delete_object(ENV["AWS_BUCKET"], key)
    true
  rescue StandardError
    false
  end
  private_class_method :delete_temp_object

  def self.invoke_input(payload, url)
    hint = payload.to_h.dig(:messages, 0, :content, 1, :text).presence ||
           "Extrae los datos de este comprobante."
    "#{hint}\nComprobante (URL firmada; descargala tal cual): #{url}"
  end
  private_class_method :invoke_input

  def self.invoke_context(source)
    { "proposito" => "extraccion_comprobante", "media_type" => source[:media_type] }
  end
  private_class_method :invoke_context

  # Cero reintentos y sin `Timeout.timeout`. En el error NUNCA va el body ni la
  # URL firmada (riesgo 13 del paquete: ahi viajan la factura y la firma).
  def self.taimes_invoke(input:, context:, esquema: nil)
    url = "#{ENV['TAIMES_INVOKE_URL'].to_s.chomp('/')}/api/public/agents/#{ENV['TAIMES_AGENT_ID']}/invoke"
    respuesta = HTTParty.post(url,
                              headers: { "X-API-Key" => ENV["TAIMES_API_KEY"],
                                         "Content-Type" => "application/json" },
                              body: { input: input, context: context,
                                      esquema: esquema }.compact.to_json,
                              open_timeout: INVOKE_OPEN_TIMEOUT,
                              timeout: INVOKE_READ_TIMEOUT)
    raise TaimesError, "invoke HTTP #{respuesta.code}" unless respuesta.code.to_i == 200

    JSON.parse(respuesta.body.to_s)
  end
  private_class_method :taimes_invoke

  # {resumen, datos, uso} -> el Hash crudo que espera `parse`, o nil. Se tolera
  # {summary, data, usage} por si el gateway algun dia alinea sus claves con su
  # doc en ingles.
  def self.parse_invoke_response(body)
    return nil unless body.is_a?(Hash)

    datos = body["datos"] || body["data"]
    if datos.is_a?(String)
      begin
        datos = JSON.parse(datos)
      rescue JSON::ParserError
        return nil
      end
    end
    return nil unless datos.is_a?(Hash) && datos.present?

    # Gemini a veces serializa el objeto ANIDADO como string JSON dentro del
    # dict libre de `datos` (visto en vivo 2026-08-18). Se repara aquí para no
    # perder las confianzas por campo; si no parsea, normalize_confidence lo
    # degrada a {} y los campos igual llegan.
    conf = datos["confidence"]
    if conf.is_a?(String)
      begin
        datos = datos.merge("confidence" => JSON.parse(conf))
      rescue JSON::ParserError
        nil
      end
    end

    uso = body["uso"] || body["usage"]
    uso.is_a?(Hash) ? datos.merge("_usage" => uso) : datos
  end
  private_class_method :parse_invoke_response

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
  rescue StandardError => e
    # Se loguea la clase y el mensaje, NUNCA el payload, el body ni la URL
    # firmada: ahi van la imagen del comprobante y la firma (riesgo 13).
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
    # El corte por tamaño va ANTES de leer (hallazgo del review 2026-08-17):
    # `read` materializa el archivo entero en el heap, asi que un PDF de 2 GB
    # subido por un usuario autenticado mataria el dyno por OOM antes de llegar
    # al check de bytesize. El bytesize de abajo queda como respaldo para las
    # entradas que no responden a `size` en bytes (p.ej. el Hash crudo).
    return :too_large if oversized_before_read?

    bytes, declared_type, filename = read_file
    return :unsupported_format if bytes.blank?
    return :too_large          if bytes.bytesize > MAX_BYTES

    media_type = resolve_media_type(declared_type, filename)
    return :unsupported_format unless SUPPORTED_TYPES.include?(media_type)

    # strict_encode64 es OBLIGATORIO: encode64 mete un \n cada 60 caracteres y
    # la API rechaza el payload con un 400 que no explica nada.
    { data: Base64.strict_encode64(bytes), media_type: media_type, filename: filename }
  end

  # Tamaño declarado por el objeto ANTES de materializar los bytes. Un Hash se
  # excluye (su `size` son claves, no bytes: lo cubre el bytesize de arriba).
  def oversized_before_read?
    return false if @file.nil? || @file.is_a?(Hash)
    return false unless @file.respond_to?(:size)

    @file.size.to_i > MAX_BYTES
  rescue StandardError
    false
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
    Excon::Error::Timeout
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

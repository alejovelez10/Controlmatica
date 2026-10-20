# Extraccion asistida de comprobantes: recibe una imagen o un PDF de una factura
# y devuelve los campos estructurados para PRE-LLENAR el formulario de gasto.
# Nunca guarda nada y nunca puede impedir el registro manual (00-ARQUITECTURA
# Bloque D.1 y riesgo 12 del paquete 10): si esto falla, el usuario digita.
#
# ============ ESTADO: LA EXTRACCION LE HABLA A CLAUDE DIRECTO ============
# Desde el paquete 17 (2026-10-19) Controlmatica dejo de usar Taimes:
# `call_vision_model` manda el payload a la API de Claude (Claude::Client) y lee
# la respuesta estructurada. Entre el 2026-08-17 y esa fecha iba al agente
# "Extractor de Comprobantes" de Taimes por su endpoint invoke.
#
# El contrato interno no cambio: validacion de entrada, normalizacion del
# archivo, armado del payload, JSON Schema de salida, umbrales de confianza,
# normalizacion de los campos leidos, mapeo de errores y Result son los mismos.
#
# Config: ANTHROPIC_API_KEY (sin ella el servicio responde `:not_configured`),
# RECEIPT_EXTRACTION_MODEL opcional y el kill switch RECEIPT_EXTRACTION_ENABLED.
# La ruta `POST /extract_receipt/report_expenses` (accion
# `ReportExpensesController#extract_receipt`, contrato D.1) es quien orquesta
# esto desde el formulario de gasto.
# ========================================================================
class ReceiptExtractionService
  # 🟡 UNICA EXCEPCION DOCUMENTADA al Result canonico del proyecto
  # (00-ARQUITECTURA 4.2, cerrado en la reauditoria). Aqui `:error` es SINGULAR
  # a proposito: es un CODIGO (:timeout, :unsupported_format, :too_large...) que
  # el llamador mapea, no un mensaje; el mensaje va aparte en `:error_message`.
  # Su unico consumidor es la accion `extract_receipt`, que la escribe este
  # mismo paquete. Fuera de aqui, un `result.error` singular sigue siendo señal
  # de desvio: el resto del proyecto usa `ok/value/errors` con errors ARRAY.
  # `policy_findings` son los motivos en texto, como siempre; `policy_findings_detail`
  # los mismos con la regla de la que salio cada uno ({ rule_id:, message: },
  # 2026-10-14). Van los dos porque el texto lo pintan la pantalla y las pruebas
  # de siempre, y la regla solo la necesita quien decide si el hallazgo aplica.
  Result = Struct.new(:ok, :fields, :confidence, :error, :error_message, :model, :usage,
                      :policy_compliant, :policy_findings, :policy_findings_detail,
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
  DEFAULT_MODEL = "claude-opus-5-5".freeze

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
      # VEREDICTO SEMANTICO. Opcionales a proposito (no estan en `required`):
      # solo tienen sentido cuando el payload lleva instrucciones que juzgar, y
      # un agente que las ignore tiene que seguir validando contra el esquema.
      policy_compliant: { type: %w[boolean null] },
      # CADA HALLAZGO CON SU REGLA (2026-10-14). En la web el agente juzga antes
      # de que se elija el tipo de gasto, contra las reglas de TODOS los tipos;
      # al guardar, el servidor descarta los hallazgos de las reglas que no
      # aplican al tipo elegido. Sin el numero de regla no podria saber cual es
      # cual y tendria que frenar o soltar todos juntos.
      policy_findings:  {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: %w[rule_id reason],
          properties: { rule_id: { type: %w[integer null] }, reason: { type: "string" } }
        }
      },
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

    Politica de gasto:
    - Si el mensaje del usuario trae un bloque "Instrucciones de la politica de gasto", juzgalo
      contra lo que ves en el comprobante y responde policy_compliant (true si lo cumple, false si
      lo incumple) y policy_findings con un objeto por cada incumplimiento: rule_id es el numero
      de la regla que incumple (cada regla viene marcada asi: [Regla 12]) y reason un motivo
      corto citando lo que viste en el documento.
    - Cada regla dice lo que NO se acepta en el comprobante. Si lo ves en el documento, es un
      incumplimiento de esa regla.
    - Juzga cada regla por separado. Si una regla habla de un tipo de gasto y el mensaje no dice
      el tipo, no la des por incumplida por eso: el sistema aplica esa parte por su cuenta.
    - Si NO hay bloque de instrucciones, o si el documento no alcanza para juzgarlas, devuelve
      policy_compliant en null y policy_findings vacio. Un false frena el registro del gasto, asi
      que no lo uses ante la duda.
  PROMPT

  # Punto de entrada unico. NUNCA lanza una excepcion: siempre devuelve Result.
  def self.extract(file, context = {}) = new(file, context).call

  # Kill switch de produccion (00-ARQUITECTURA 7.9). Arranca APAGADO: se
  # enciende con RECEIPT_EXTRACTION_ENABLED=true una vez cargada la api key.
  def self.enabled? = ENV.fetch("RECEIPT_EXTRACTION_ENABLED", "false").to_s.strip.casecmp("true").zero?

  def self.configured? = Claude.configurado?

  def self.model = ENV["RECEIPT_EXTRACTION_MODEL"].presence || DEFAULT_MODEL

  # ==========================================================================
  # SEAM DE RED CANONICO (00-ARQUITECTURA 6.7, vinculante).
  # Unico metodo de todo el servicio que puede abrir un socket.
  # Publico a proposito: los tests lo reemplazan con
  # `ReceiptExtractionService.stub(:call_vision_model, ...)` y el initializer de
  # E2E del paquete 12 le hace `prepend`. NO recibe el cliente por parametro.
  #
  # -------------- IMPLEMENTADO: LA EXTRACCION LE HABLA A CLAUDE -------------
  # Paquete 17 (2026-10-19): el payload que arma `payload_for` ya tiene la forma
  # de la API de Claude (modelo, system, output_config con el JSON Schema y el
  # comprobante en base64), asi que va tal cual a /v1/messages. Lo unico que se
  # ajusta es el esquema: los tipos que admiten null pasan a `anyOf`
  # (Claude::Esquema), sin cambiar su significado.
  #
  # CONTRATO DE RETORNO (intacto respecto del plan original):
  #   - el Hash CRUDO con las claves del SCHEMA, con "_usage" (tokens);
  #   - :refusal si los clasificadores de seguridad declinaron;
  #   - nil si la respuesta no trae un JSON utilizable;
  #   - puede lanzar: `call` rescata todo y lo mapea (Claude::Client::Timeout
  #     -> :timeout; el resto -> :provider_error).
  #
  # PRESUPUESTO DE TIEMPO: open 2 s + read 25 s. Con Taimes eran 16 s de
  # lectura, medidos para Gemini flash-lite; Claude leyendo una imagen con
  # razonamiento corto tarda mas, y el techo real es el router de Heroku (30 s).
  # Cero reintentos y prohibido `Timeout.timeout`, igual que siempre: con 5
  # hilos de Puma, una lectura colgada no puede retener uno indefinidamente.
  # ==========================================================================
  OPEN_TIMEOUT = 2
  READ_TIMEOUT = 25

  # Un payload sin el comprobante es un error de programacion: se corta ANTES
  # de abrir un socket y de gastar un token.
  class PayloadInvalido < StandardError; end

  def self.call_vision_model(payload)
    bloque = payload.to_h.dig(:messages, 0, :content, 0)
    unless bloque.is_a?(Hash) && %w[image document].include?(bloque[:type].to_s)
      raise PayloadInvalido, "payload sin bloque de documento"
    end

    cuerpo = payload.to_h.deep_dup
    esquema = cuerpo.dig(:output_config, :format, :schema)
    cuerpo[:output_config][:format][:schema] = Claude::Esquema.compatible(esquema) if esquema

    respuesta = cliente_claude.mensajes(cuerpo)
    return :refusal if respuesta["stop_reason"] == "refusal"

    datos = JSON.parse(Claude.texto_de(respuesta).to_s)
    return nil unless datos.is_a?(Hash) && datos.present?

    respuesta["usage"].is_a?(Hash) ? datos.merge("_usage" => respuesta["usage"]) : datos
  rescue JSON::ParserError
    nil
  end

  def self.cliente_claude
    Claude::Client.new(open_timeout: OPEN_TIMEOUT, read_timeout: READ_TIMEOUT)
  end
  private_class_method :cliente_claude

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
      # 8192 y no 2048: en los modelos actuales el razonamiento esta siempre
      # encendido y CUENTA contra max_tokens; con 2048 una factura larga podia
      # quedarse sin espacio para el JSON.
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      # effort "low": leer campos de una factura no exige razonamiento profundo
      # y el presupuesto de latencia del contrato D.1 es corto. No se pasa
      # thinking: { type: "disabled" }: en Claude Opus 5.5 es un 400, y bajar
      # el effort es el control que queda.
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
    partes = ["Extrae los datos de este comprobante."]
    partes << "El gasto se imputa al centro de costos #{code}." if code

    # LAS INSTRUCCIONES DE LA REGLA VIAJAN AQUI (2026-10-03). Son el texto libre
    # que el administrador escribe en la regla de gasto y que este servidor no
    # sabe evaluar ("no se aceptan licores, ni propinas superiores al 10%").
    # Antes solo las veia el agente de WhatsApp, asi que el mismo comprobante se
    # juzgaba por un canal y por el otro no.
    tipo = @context[:tipo_de_gasto].to_s.squish
    partes << "El tipo de gasto elegido es «#{tipo}»." if tipo.present?

    # UNA REGLA POR BLOQUE, CON SU NUMERO (2026-10-14): es lo que deja al agente
    # decir de que regla sale cada hallazgo. El texto pelado de antes se sigue
    # aceptando para quien no tenga las reglas a mano.
    instrucciones = instrucciones_etiquetadas.presence || @context[:agent_instructions].to_s.strip
    if instrucciones.present?
      partes << "\n\nInstrucciones de la politica de gasto:\n#{instrucciones}"
    end

    partes.join(" ")
  end

  # [{ id:, nombre:, instrucciones: }] -> "[Regla 12 · Sin licor]\ntexto\n\n[Regla 15 ...]".
  def instrucciones_etiquetadas
    Array(@context[:reglas]).filter_map do |regla|
      texto = regla[:instrucciones].to_s.strip
      next if texto.empty?

      # "No se acepta" va escrito porque es lo que la pantalla le pide al
      # administrador: que liste lo prohibido ("bebidas alcoholicas, propinas
      # mayores al 10%"). Sin el encabezado, esa lista suelta se puede leer como
      # lo contrario, como lo que el comprobante deberia tener.
      "[Regla #{regla[:id]} · #{regla[:nombre].to_s.squish}] No se acepta en el comprobante:\n#{texto}"
    end.join("\n\n")
  end

  # ---- post-proceso de la respuesta del modelo -------------------------------

  def parse(raw)
    data = raw.respond_to?(:deep_stringify_keys) ? raw.deep_stringify_keys : raw.to_h.deep_stringify_keys

    return failure(:unreadable)     if flag_true?(data["unreadable"])
    return failure(:not_an_invoice) if data.key?("is_invoice") && !flag_true?(data["is_invoice"])

    confidence = normalize_confidence(data["confidence"])
    fields     = build_fields(data, confidence)
    detalle    = normalize_policy_findings(data["policy_findings"])

    Result.new(ok: true, fields: fields, confidence: confidence, error: nil, error_message: nil,
               model: self.class.model, usage: data["_usage"],
               # `fetch` con default nil y no `[]`: la clave ausente (el agente
               # que todavia no implementa el veredicto) y un null explicito son
               # el mismo caso —nadie lo juzgo—, pero conviene que se lea.
               policy_compliant: normalize_policy_compliant(data["policy_compliant"]),
               policy_findings: detalle.map { |h| h[:message] },
               policy_findings_detail: detalle)
  end

  # SOLO `true` Y `false` CUENTAN. Cualquier otra cosa —la clave ausente, un
  # null, un "quizas"— es "nadie lo juzgo", que es distinto de "lo cumple": un
  # false frena el guardado cuando la regla es obligatoria, asi que convertir
  # basura en un veredicto seria bloquear gastos por un dato que nadie emitio.
  def normalize_policy_compliant(raw)
    return true  if raw == true
    return false if raw == false

    nil
  end

  # => [{ rule_id: 12 | nil, message: "..." }]
  #
  # Acepta las tres formas que puede devolver el agente: el objeto del esquema
  # actual, el texto suelto de antes del 2026-10-14 y el texto con prefijo
  # "[Regla 12] ...". `rule_id` nil significa "no se sabe de que regla salio", y
  # el servidor lo trata como un hallazgo que aplica (ExpenseRuleService), que
  # es lo prudente: no se puede soltar un incumplimiento solo porque no trae
  # etiqueta.
  def normalize_policy_findings(raw)
    Array(raw).filter_map do |item|
      if item.is_a?(Hash)
        h = item.stringify_keys
        motivo = (h["reason"] || h["message"]).to_s.strip
        regla  = entero_o_nil(h["rule_id"])
      else
        regla, motivo = separar_prefijo_de_regla(item.to_s.strip)
      end
      next if motivo.empty?

      { rule_id: regla, message: motivo }
    end.first(10)
  end

  PREFIJO_DE_REGLA = /\A\[\s*regla\s*#?\s*(\d+)[^\]]*\]\s*[:\-–·]?\s*/i.freeze

  def separar_prefijo_de_regla(texto)
    m = PREFIJO_DE_REGLA.match(texto)
    return [nil, texto] if m.nil?

    [m[1].to_i, texto[m.end(0)..].to_s.strip]
  end

  def entero_o_nil(valor)
    return valor if valor.is_a?(Integer)
    return valor.to_i if valor.is_a?(String) && valor.strip.match?(/\A\d+\z/)

    nil
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

  # El mapeo se hace por NOMBRE de clase, no por constante: asi una clase que no
  # este cargada (la gema oficial `anthropic`, cuando se suba Ruby) no revienta
  # con NameError, que es exactamente lo contrario de lo que promete este
  # servicio.
  TIMEOUT_ERROR_NAMES = %w[
    Claude::Client::Timeout
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

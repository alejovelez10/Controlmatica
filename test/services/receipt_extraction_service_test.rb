require "test_helper"
# minitest/mock trae Object#stub y NO es una gema nueva: viene dentro de
# minitest. rails/test_help no lo carga solo y test_helper.rb es del paquete 01,
# asi que el require va aqui (mismo patron que exchange_rate_service_test.rb).
require "minitest/mock"

# NINGUN test de este archivo toca la red. El unico seam es
# ReceiptExtractionService.call_vision_model (00-ARQUITECTURA 6.7), que
# `with_fake_extractor` reemplaza con el doble de
# test/support/fake_anthropic_client.rb.
#
# ALCANCE: el seam real llama al agente extractor de Taimes (ver el bloque del
# seam en el servicio); sus piezas internas se prueban en
# test/services/receipt_extraction_seam_test.rb. Lo que se prueba aqui es TODO
# lo que rodea a esa llamada: contrato del Result, validacion de entrada, armado
# del payload, umbrales de confianza, normalizacion y mapeo de errores.
class ReceiptExtractionServiceTest < ActiveSupport::TestCase
  include WithFakeExtractor

  ENV_CLAVES = %w[TAIMES_INVOKE_URL TAIMES_AGENT_ID TAIMES_API_KEY
                  RECEIPT_EXTRACTION_ENABLED RECEIPT_EXTRACTION_MODEL].freeze

  def setup
    # El servicio arranca APAGADO por defecto (kill switch). Los tests del camino
    # feliz lo encienden a proposito; los de configuracion lo vuelven a apagar.
    @env_previo = ENV.to_hash.slice(*ENV_CLAVES)
    ENV["TAIMES_INVOKE_URL"]          = "http://taimes.invalid"
    ENV["TAIMES_AGENT_ID"]            = "agente-de-mentira"
    ENV["TAIMES_API_KEY"]             = "kmz_de-mentira-no-se-usa"
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "true"
    ENV.delete("RECEIPT_EXTRACTION_MODEL")
  end

  def teardown
    ENV_CLAVES.each do |clave|
      @env_previo.key?(clave) ? ENV[clave] = @env_previo[clave] : ENV.delete(clave)
    end
    @grande&.close!
  end

  # ---- camino feliz ---------------------------------------------------------

  test "extrae todos los campos de un pdf" do
    with_fake_extractor(payload_modelo) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert resultado.ok?
      assert_equal "Distribuidora El Sol SAS", resultado.fields[:provider_name]
      assert_equal "9001234567",               resultado.fields[:identification]
      assert_equal "FE-4821",                  resultado.fields[:invoice_number]
      assert_equal "COP",                      resultado.fields[:currency]
      assert_equal BigDecimal("500000.0"),     resultado.fields[:total]
      assert_equal "Papeleria y utiles de oficina", resultado.fields[:description]
    end
  end

  test "invoice_date se devuelve como Date" do
    with_fake_extractor(payload_modelo("invoice_date" => "2026-07-14")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_kind_of Date, resultado.fields[:invoice_date]
      assert_equal Date.new(2026, 7, 14), resultado.fields[:invoice_date]
    end
  end

  test "fecha ilegible no revienta y deja el campo en nulo" do
    with_fake_extractor(payload_modelo("invoice_date" => "no-es-fecha")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert resultado.ok?
      assert_nil resultado.fields[:invoice_date]
    end
  end

  # BigDecimal y no Float: son importes que terminan en un documento contable.
  test "los valores se devuelven como BigDecimal" do
    with_fake_extractor(payload_modelo) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_kind_of BigDecimal, resultado.fields[:total]
      assert_kind_of BigDecimal, resultado.fields[:value]
      assert_kind_of BigDecimal, resultado.fields[:tax]
    end
  end

  test "identification se normaliza a solo digitos" do
    with_fake_extractor(payload_modelo("identification" => "900.123.456-7")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal "9001234567", resultado.fields[:identification]
    end
  end

  test "identification sin ningun digito queda en nulo" do
    with_fake_extractor(payload_modelo("identification" => "NO APLICA")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_nil resultado.fields[:identification]
    end
  end

  test "manda un bloque document para un pdf" do
    with_fake_extractor(payload_modelo) do |fake|
      ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      bloque = fake.calls.first[:messages].first[:content].first

      assert_equal "document", bloque[:type]
      assert_equal "application/pdf", bloque[:source][:media_type]
      assert_equal "base64", bloque[:source][:type]
    end
  end

  test "manda un bloque image para un jpg" do
    with_fake_extractor(payload_modelo) do |fake|
      ReceiptExtractionService.extract(upload_fixture("comprobante_factura.jpg"))

      bloque = fake.calls.first[:messages].first[:content].first

      assert_equal "image", bloque[:type]
      assert_equal "image/jpeg", bloque[:source][:media_type]
    end
  end

  # encode64 mete un \n cada 60 caracteres y la API rechaza el payload con un 400
  # que no explica nada. Es el error mas comun al implementar esto.
  test "el base64 no tiene saltos de linea" do
    with_fake_extractor(payload_modelo) do |fake|
      ReceiptExtractionService.extract(upload_fixture("comprobante_factura.jpg"))

      data = fake.calls.first[:messages].first[:content].first[:source][:data]

      assert data.present?
      refute_includes data, "\n"
    end
  end

  test "usa el modelo por defecto cuando no hay variable de entorno" do
    with_fake_extractor(payload_modelo) do |fake|
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal "claude-opus-5", fake.calls.first[:model]
      assert_equal "claude-opus-5", resultado.model
    end
  end

  test "usa el modelo de la variable de entorno" do
    ENV["RECEIPT_EXTRACTION_MODEL"] = "claude-haiku-4-5-20251001"

    with_fake_extractor(payload_modelo) do |fake|
      ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal "claude-haiku-4-5-20251001", fake.calls.first[:model]
    end
  end

  test "la llamada usa salida estructurada con el json schema" do
    with_fake_extractor(payload_modelo) do |fake|
      ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      formato = fake.calls.first[:output_config][:format]

      assert_equal "json_schema", formato[:type]
      assert_equal ReceiptExtractionService::SCHEMA, formato[:schema]
      assert_equal 2048, fake.calls.first[:max_tokens]
      assert_includes fake.calls.first[:system], "extractor de datos de comprobantes"
    end
  end

  test "el contexto del centro de costos viaja en el mensaje del usuario" do
    with_fake_extractor(payload_modelo) do |fake|
      ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"),
                                       cost_center_code: "CC-100")

      texto = fake.calls.first[:messages].first[:content].last[:text]

      assert_includes texto, "CC-100"
    end
  end

  test "acepta un hash con los bytes crudos ademas de un archivo subido" do
    bytes = File.binread(Rails.root.join("test/fixtures/files/comprobante_factura.jpg"))

    with_fake_extractor(payload_modelo) do |fake|
      resultado = ReceiptExtractionService.extract(data: bytes, media_type: "image/jpeg",
                                                   filename: "comprobante_factura.jpg")

      assert resultado.ok?
      assert_equal "image", fake.calls.first[:messages].first[:content].first[:type]
    end
  end

  # El navegador sube "application/octet-stream" a menudo: si no se dedujera por
  # la extension, un JPG legitimo se rechazaria.
  test "deduce el formato por la extension cuando el content type es generico" do
    bytes = File.binread(Rails.root.join("test/fixtures/files/comprobante_factura.jpg"))

    with_fake_extractor(payload_modelo) do |fake|
      resultado = ReceiptExtractionService.extract(data: bytes,
                                                   media_type: "application/octet-stream",
                                                   filename: "foto.jpg")

      assert resultado.ok?
      assert_equal "image/jpeg", fake.calls.first[:messages].first[:content].first[:source][:media_type]
    end
  end

  # ---- contrato del Result --------------------------------------------------

  test "el Result responde a los siete miembros del contrato" do
    with_fake_extractor(payload_modelo) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      %i[ok? error? fields confidence error error_message model usage].each do |mensaje|
        assert_respond_to resultado, mensaje
      end
    end
  end

  test "fields trae siempre las diez claves documentadas en el exito" do
    with_fake_extractor(payload_modelo) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal claves_esperadas, resultado.fields.keys.sort
    end
  end

  # El frontend lee las claves sin preguntar: un nil se pinta, una clave ausente
  # revienta.
  test "fields trae siempre las diez claves documentadas tambien en el error" do
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "false"

    resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

    refute resultado.ok?
    assert_equal claves_esperadas, resultado.fields.keys.sort
    assert_equal [], resultado.fields[:low_confidence]
    assert_nil resultado.fields[:total]
  end

  test "todos los codigos de error tienen mensaje y ofrecen el registro manual" do
    ReceiptExtractionService::ERROR_MESSAGES.each do |codigo, mensaje|
      assert mensaje.present?, "#{codigo} sin mensaje"
      assert_includes mensaje, "manualmente", "#{codigo} no ofrece el registro manual"
    end
  end

  test "extract nunca propaga una excepcion" do
    with_fake_extractor(RuntimeError.new("el proveedor exploto")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      refute resultado.ok?
      assert_equal :provider_error, resultado.error
      assert_equal ReceiptExtractionService::ERROR_MESSAGES[:provider_error], resultado.error_message
    end
  end

  # ---- el seam que implementa Taimes ---------------------------------------

  test "el seam de red es call_vision_model y el seam viejo no existe" do
    assert_respond_to ReceiptExtractionService, :call_vision_model
    refute_respond_to ReceiptExtractionService, :api_client=
    refute_respond_to ReceiptExtractionService, :reset_api_client!
  end

  # El seam ya esta implementado (llama a Taimes): un payload sin bloque de
  # documento se rechaza ANTES de abrir cualquier socket.
  test "call_vision_model exige un payload con bloque de documento" do
    error = assert_raises(ReceiptExtractionService::TaimesError) do
      ReceiptExtractionService.call_vision_model(model: "x")
    end

    assert_includes error.message, "documento"
  end

  # Y a traves de `extract`, ese mismo fallo termina en el error estandar: el
  # contrato D.1 dice que extraer nunca puede impedir registrar a mano.
  test "un fallo del seam se mapea a provider_error y no revienta" do
    ReceiptExtractionService.stub(:call_vision_model, ->(_payload) { raise ReceiptExtractionService::TaimesError, "invoke HTTP 500" }) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      refute resultado.ok?
      assert_equal :provider_error, resultado.error
    end
  end

  # ---- configuracion --------------------------------------------------------

  test "sin la api key de Taimes devuelve not_configured y no revienta" do
    ENV.delete("TAIMES_API_KEY")

    with_fake_extractor(payload_modelo) do |fake|
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      refute resultado.ok?
      assert_equal :not_configured, resultado.error
      assert resultado.not_configured?
      assert_empty fake.calls
    end
  end

  test "con el kill switch apagado devuelve disabled sin llamar al modelo" do
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "false"

    with_fake_extractor(payload_modelo) do |fake|
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      refute resultado.ok?
      assert_equal :disabled, resultado.error
      assert resultado.not_configured?
      assert_empty fake.calls
    end
  end

  # Decision de esta entrega: el flag arranca apagado porque el seam todavia no
  # existe. Si alguien cambia el default, este test se cae.
  test "sin la variable de entorno el kill switch arranca apagado" do
    ENV.delete("RECEIPT_EXTRACTION_ENABLED")

    refute ReceiptExtractionService.enabled?

    with_fake_extractor(payload_modelo) do |fake|
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal :disabled, resultado.error
      assert_empty fake.calls
    end
  end

  test "cualquier valor distinto de true deja el kill switch apagado" do
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "si"

    refute ReceiptExtractionService.enabled?
  end

  # ---- confianza ------------------------------------------------------------

  test "un campo con confianza muy baja se anula y se marca" do
    payload = payload_modelo("confidence" => { "invoice_number" => 0.10 })

    with_fake_extractor(payload) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_nil resultado.fields[:invoice_number]
      assert_includes resultado.fields[:low_confidence], "invoice_number"
    end
  end

  test "un campo con confianza media se conserva y se marca" do
    payload = payload_modelo("confidence" => { "invoice_date" => 0.45 })

    with_fake_extractor(payload) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal Date.new(2026, 7, 14), resultado.fields[:invoice_date]
      assert_includes resultado.fields[:low_confidence], "invoice_date"
    end
  end

  test "un campo con confianza alta no se marca" do
    with_fake_extractor(payload_modelo) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_empty resultado.fields[:low_confidence]
    end
  end

  test "la confianza por campo se devuelve como numero" do
    with_fake_extractor(payload_modelo) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_kind_of Numeric, resultado.confidence["invoice_number"]
      assert_equal ReceiptExtractionService::CONFIDENCE_KEYS.sort, resultado.confidence.keys.sort
    end
  end

  # ---- fallos y bordes ------------------------------------------------------

  test "documento ilegible devuelve el error unreadable" do
    with_fake_extractor(payload_modelo("unreadable" => true)) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_ilegible.png"))

      refute resultado.ok?
      assert_equal :unreadable, resultado.error
      assert_includes resultado.error_message, "Complete los datos manualmente"
    end
  end

  test "un archivo que no es factura devuelve not_an_invoice" do
    with_fake_extractor(payload_modelo("is_invoice" => false)) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.jpg"))

      assert_equal :not_an_invoice, resultado.error
    end
  end

  # HEIC: iPhone lo sube desde Safari y la API de vision no lo acepta. Se rechaza
  # ANTES de la llamada para no gastar tokens en algo que va a fallar.
  test "el formato heic se rechaza sin llamar al modelo" do
    with_fake_extractor(payload_modelo) do |fake|
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_iphone.heic"))

      assert_equal :unsupported_format, resultado.error
      assert_empty fake.calls
    end
  end

  test "un ejecutable disfrazado se rechaza sin llamar al modelo" do
    with_fake_extractor(payload_modelo) do |fake|
      resultado = ReceiptExtractionService.extract(upload_fixture("malicioso.exe"))

      assert_equal :unsupported_format, resultado.error
      assert_empty fake.calls
    end
  end

  test "sin archivo devuelve unsupported_format sin llamar al modelo" do
    with_fake_extractor(payload_modelo) do |fake|
      resultado = ReceiptExtractionService.extract(nil)

      assert_equal :unsupported_format, resultado.error
      assert_empty fake.calls
    end
  end

  # El archivo grande NO se commitea (7.12): se genera y se borra en el propio
  # test.
  test "un archivo de mas de 20 MB se rechaza sin llamar al modelo" do
    @grande = Tempfile.new(["comprobante_gigante", ".jpg"])
    @grande.binmode
    @grande.write("0" * (ReceiptExtractionService::MAX_BYTES + 1))
    @grande.rewind

    subida = Rack::Test::UploadedFile.new(@grande.path, "image/jpeg")

    with_fake_extractor(payload_modelo) do |fake|
      resultado = ReceiptExtractionService.extract(subida)

      assert_equal :too_large, resultado.error
      assert_empty fake.calls
    end
  end

  test "un timeout del proveedor devuelve error timeout y no se propaga" do
    with_fake_extractor(Anthropic::Errors::APIConnectionError.new("connection reset")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      refute resultado.ok?
      assert_equal :timeout, resultado.error
    end
  end

  # Excon es quien habla con S3 dentro del seam (fog-aws): su timeout tambien
  # es un timeout, no un provider_error generico.
  test "un timeout de Excon (S3) devuelve error timeout" do
    with_fake_extractor(Excon::Error::Timeout.new("read timeout reached")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal :timeout, resultado.error
    end
  end

  test "un error de estado del proveedor devuelve provider_error" do
    with_fake_extractor(Anthropic::Errors::APIStatusError.new("500 Internal Server Error")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal :provider_error, resultado.error
    end
  end

  test "un rate limit del proveedor devuelve provider_error" do
    with_fake_extractor(Anthropic::Errors::RateLimitError.new("429")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal :provider_error, resultado.error
    end
  end

  # El JSON.parse vive dentro del seam (lo escribe Taimes), asi que lo que llega
  # aqui es la excepcion.
  test "un json malformado devuelve provider_error" do
    with_fake_extractor(JSON::ParserError.new("unexpected token")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal :provider_error, resultado.error
    end
  end

  test "una respuesta sin bloque de texto devuelve provider_error" do
    with_fake_extractor(nil) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal :provider_error, resultado.error
    end
  end

  test "un rechazo del modelo devuelve refusal" do
    with_fake_extractor(:refusal) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal :refusal, resultado.error
    end
  end

  # ---- normalizacion --------------------------------------------------------

  test "una moneda invalida se fuerza a COP y se marca como dudosa" do
    with_fake_extractor(payload_modelo("currency" => "XYZ")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal "COP", resultado.fields[:currency]
      assert_includes resultado.fields[:low_confidence], "currency"
    end
  end

  test "una moneda del catalogo se normaliza a mayusculas" do
    with_fake_extractor(payload_modelo("currency" => " usd ")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal "USD", resultado.fields[:currency]
      refute_includes resultado.fields[:low_confidence], "currency"
    end
  end

  test "el total se calcula cuando falta pero hay value y tax" do
    with_fake_extractor(payload_modelo("total" => nil, "value" => 100, "tax" => 19)) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal BigDecimal("119"), resultado.fields[:total]
    end
  end

  test "el value se calcula cuando falta pero hay total y tax" do
    with_fake_extractor(payload_modelo("value" => nil, "total" => 119, "tax" => 19)) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal BigDecimal("100"), resultado.fields[:value]
    end
  end

  test "un importe negativo se descarta en vez de propagarse" do
    with_fake_extractor(payload_modelo("total" => -500, "value" => nil, "tax" => nil)) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_nil resultado.fields[:total]
    end
  end

  test "el usage del modelo llega al Result cuando el seam lo manda" do
    payload = payload_modelo("_usage" => { "input_tokens" => 1834, "output_tokens" => 212 })

    with_fake_extractor(payload) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.pdf"))

      assert_equal 1834, resultado.usage["input_tokens"]
    end
  end

  private

  def claves_esperadas
    (ReceiptExtractionService::FIELD_KEYS.map(&:to_sym) + [:low_confidence]).sort
  end
end

require "test_helper"
require "minitest/mock"

# Piezas internas del seam `call_vision_model` (la llamada al agente extractor
# de Taimes). CERO RED: los privados que abren socket (s3_connection,
# upload_temp_object, taimes_invoke, delete_temp_object) se reemplazan con
# Minitest#stub — WebMock sigue prohibido (00-ARQUITECTURA 6.7). Lo que se
# prueba es la traduccion payload -> invoke -> Hash crudo, el mapeo de fallos y
# el ensure que borra el temporal de S3.
class ReceiptExtractionSeamTest < ActiveSupport::TestCase
  include WithFakeExtractor

  ENV_CLAVES = %w[TAIMES_INVOKE_URL TAIMES_AGENT_ID TAIMES_API_KEY
                  RECEIPT_EXTRACTION_ENABLED AWS_BUCKET].freeze

  def setup
    @env_previo = ENV.to_hash.slice(*ENV_CLAVES)
    ENV["TAIMES_INVOKE_URL"]          = "http://taimes.invalid"
    ENV["TAIMES_AGENT_ID"]            = "agente-extractor"
    ENV["TAIMES_API_KEY"]             = "kmz_de-mentira"
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "true"
    ENV["AWS_BUCKET"] ||= "bucket-de-mentira"
  end

  def teardown
    ENV_CLAVES.each do |clave|
      @env_previo.key?(clave) ? ENV[clave] = @env_previo[clave] : ENV.delete(clave)
    end
  end

  # Payload REAL armado por el servicio (payload_for es privado de instancia):
  # asi el round-trip document_block -> document_source_from se prueba contra la
  # forma verdadera, no contra una copia escrita a mano.
  def payload_real(fixture = "comprobante_factura.jpg", context = {})
    servicio = ReceiptExtractionService.new(upload_fixture(fixture), context)
    source   = servicio.send(:build_source)
    servicio.send(:payload_for, source)
  end

  # Ejecuta el bloque con los cuatro privados de red reemplazados. `respuesta`
  # es lo que devuelve (o lanza) taimes_invoke; `borrados` acumula las keys que
  # pasaron por delete_temp_object, para poder afirmar el ensure.
  def con_red_stubeada(respuesta, borrados = [])
    invoke = lambda do |*_args, **_kwargs|
      raise respuesta if respuesta.is_a?(Exception) || (respuesta.is_a?(Class) && respuesta <= Exception)

      respuesta
    end

    ReceiptExtractionService.stub(:s3_connection, :fake_s3) do
      ReceiptExtractionService.stub(:upload_temp_object, ->(*_a) { "uploads/tmp/extract/x/comprobante.jpg" }) do
        ReceiptExtractionService.stub(:presign_get, ->(*_a) { "https://s3.invalid/firmada?X-Amz-Signature=x" }) do
          ReceiptExtractionService.stub(:delete_temp_object, ->(*a) { borrados << a.last; true }) do
            ReceiptExtractionService.stub(:taimes_invoke, invoke) do
              yield
            end
          end
        end
      end
    end
  end

  # ---- document_source_from -------------------------------------------------

  test "document_source_from recupera los bytes y el media type del payload real" do
    bytes   = File.binread(Rails.root.join("test/fixtures/files/comprobante_factura.jpg"))
    payload = payload_real("comprobante_factura.jpg")

    source = ReceiptExtractionService.send(:document_source_from, payload)

    assert_equal bytes, source[:bytes]
    assert_equal "image/jpeg", source[:media_type]
  end

  test "document_source_from devuelve nil sin bloque de documento" do
    assert_nil ReceiptExtractionService.send(:document_source_from, { model: "x" })
    assert_nil ReceiptExtractionService.send(:document_source_from, {})
  end

  # ---- parse_invoke_response ------------------------------------------------

  test "parse_invoke_response entrega los datos crudos con el uso como _usage" do
    body = { "resumen" => "ok", "datos" => payload_modelo, "uso" => { "input_tokens" => 10 } }

    crudo = ReceiptExtractionService.send(:parse_invoke_response, body)

    assert_equal "Distribuidora El Sol SAS", crudo["provider_name"]
    assert_equal 10, crudo["_usage"]["input_tokens"]
  end

  test "parse_invoke_response repara una confidence serializada como string" do
    # Peculiaridad real de Gemini con el dict libre de `datos` (2026-08-18).
    body = { "datos" => payload_modelo.merge("confidence" => confianza_alta.to_json) }

    crudo = ReceiptExtractionService.send(:parse_invoke_response, body)

    assert_kind_of Hash, crudo["confidence"]
    assert_in_delta 0.95, crudo["confidence"]["provider_name"]
  end

  test "parse_invoke_response tolera datos como string json y claves en ingles" do
    body = { "data" => payload_modelo.to_json, "usage" => { "output_tokens" => 3 } }

    crudo = ReceiptExtractionService.send(:parse_invoke_response, body)

    assert_equal "FE-4821", crudo["invoice_number"]
    assert_equal 3, crudo["_usage"]["output_tokens"]
  end

  test "parse_invoke_response devuelve nil con datos ausentes, vacios o invalidos" do
    [{ "resumen" => "x" }, { "datos" => {} }, { "datos" => "no-es-json" },
     { "datos" => [1, 2] }, "no-hash", nil].each do |body|
      assert_nil ReceiptExtractionService.send(:parse_invoke_response, body),
                 "esperaba nil para #{body.inspect}"
    end
  end

  # ---- invoke_input ---------------------------------------------------------

  test "invoke_input lleva la URL firmada y el hint del centro de costos" do
    payload = payload_real("comprobante_factura.jpg", cost_center_code: "CC-9")

    input = ReceiptExtractionService.send(:invoke_input, payload, "https://s3.invalid/firmada")

    assert_includes input, "https://s3.invalid/firmada"
    assert_includes input, "CC-9"
  end

  # ---- configured? ----------------------------------------------------------

  test "configured? exige las tres variables de Taimes" do
    assert ReceiptExtractionService.configured?

    ReceiptExtractionService::TAIMES_ENV_KEYS.each do |clave|
      valor = ENV.delete(clave)
      refute ReceiptExtractionService.configured?, "sin #{clave} deberia ser false"
      ENV[clave] = valor
    end
  end

  # ---- fixes del review adversarial (2026-08-17) ----------------------------

  test "la conexion S3 del seam lleva timeouts cortos y un solo intento" do
    capturado = nil
    Fog::Storage.stub(:new, ->(opts) { capturado = opts; :conn }) do
      ReceiptExtractionService.send(:s3_connection)
    end

    opciones = capturado[:connection_options]
    assert_equal 1, opciones[:retry_limit], "sin reintentos: fog-aws marca put/delete idempotentes"
    assert opciones[:connect_timeout] <= 2
    assert opciones[:read_timeout] <= 5
    assert opciones[:write_timeout] <= 5
  end

  test "un archivo gigante se rechaza SIN leerlo a memoria" do
    gigante = Object.new
    def gigante.size = ReceiptExtractionService::MAX_BYTES + 1
    def gigante.read = raise("el archivo no se debe leer: el corte va antes del read")

    resultado = ReceiptExtractionService.extract(gigante)

    assert_equal :too_large, resultado.error
  end

  # ---- el seam completo, con la red reemplazada -----------------------------

  test "el camino feliz atraviesa el seam y borra el temporal" do
    borrados  = []
    respuesta = { "resumen" => "ok", "datos" => payload_modelo, "uso" => { "input_tokens" => 5 } }

    con_red_stubeada(respuesta, borrados) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.jpg"))

      assert resultado.ok?
      assert_equal "Distribuidora El Sol SAS", resultado.fields[:provider_name]
      assert_equal 5, resultado.usage["input_tokens"]
    end

    assert_equal ["uploads/tmp/extract/x/comprobante.jpg"], borrados
  end

  test "un timeout de la llamada a Taimes termina en :timeout y el temporal se borra igual" do
    borrados = []

    con_red_stubeada(Net::ReadTimeout.new, borrados) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.jpg"))

      refute resultado.ok?
      assert_equal :timeout, resultado.error
    end

    assert_equal 1, borrados.size, "el ensure debe borrar el temporal aunque el invoke lance"
  end

  test "un HTTP distinto de 200 del invoke termina en :provider_error" do
    con_red_stubeada(ReceiptExtractionService::TaimesError.new("invoke HTTP 502")) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.jpg"))

      refute resultado.ok?
      assert_equal :provider_error, resultado.error
    end
  end

  test "una respuesta de Taimes sin datos utilizables termina en :provider_error" do
    con_red_stubeada({ "resumen" => "no pude", "datos" => {} }) do
      resultado = ReceiptExtractionService.extract(upload_fixture("comprobante_factura.jpg"))

      refute resultado.ok?
      assert_equal :provider_error, resultado.error
    end
  end
end

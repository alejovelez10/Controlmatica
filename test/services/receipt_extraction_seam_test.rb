require "test_helper"
require "minitest/mock"

# El seam `call_vision_model` contra la API de Claude (paquete 17). CERO RED: el
# cliente HTTP se arma sobre el adaptador de prueba de Faraday, asi que lo que se
# prueba es exactamente lo que se le manda a /v1/messages y como se lee lo que
# vuelve. WebMock sigue prohibido (00-ARQUITECTURA 6.7).
class ReceiptExtractionSeamTest < ActiveSupport::TestCase
  include WithFakeExtractor

  ENV_CLAVES = %w[ANTHROPIC_API_KEY RECEIPT_EXTRACTION_ENABLED RECEIPT_EXTRACTION_MODEL].freeze

  def setup
    @env_previo = ENV.to_hash.slice(*ENV_CLAVES)
    ENV["ANTHROPIC_API_KEY"] = "sk-ant-de-mentira"
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "true"
    ENV.delete("RECEIPT_EXTRACTION_MODEL")
    @stubs = Faraday::Adapter::Test::Stubs.new
  end

  def teardown
    ENV_CLAVES.each do |clave|
      @env_previo.key?(clave) ? ENV[clave] = @env_previo[clave] : ENV.delete(clave)
    end
  end

  def cliente_de_prueba
    conexion = Faraday.new(url: Claude::API_HOST) { |f| f.adapter :test, @stubs }
    Claude::Client.new(api_key: "sk-ant-de-mentira", conexion: conexion)
  end

  # Respuesta con la forma real: puede traer un bloque `thinking` vacio antes
  # del texto, y el JSON viene en el bloque de texto.
  def respuesta_de_claude(datos, stop_reason: "end_turn")
    {
      id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5",
      content: [{ type: "thinking", thinking: "", signature: "sig" },
                { type: "text", text: datos.is_a?(String) ? datos : datos.to_json }],
      stop_reason: stop_reason,
      usage: { input_tokens: 1500, output_tokens: 300 }
    }.to_json
  end

  def extraer(fixture = "comprobante_factura.jpg")
    ReceiptExtractionService.stub(:cliente_claude, cliente_de_prueba) do
      ReceiptExtractionService.extract(upload_fixture(fixture))
    end
  end

  test "el camino feliz llega a /v1/messages y devuelve los campos con el uso" do
    enviado = nil
    cabeceras = nil
    @stubs.post("/v1/messages") do |env|
      enviado = JSON.parse(env.body)
      cabeceras = env.request_headers
      [200, { "Content-Type" => "application/json" }, respuesta_de_claude(payload_modelo)]
    end

    resultado = extraer

    assert resultado.ok?
    assert_equal "Distribuidora El Sol SAS", resultado.fields[:provider_name]
    assert_equal 1500, resultado.usage["input_tokens"]
    assert_equal "sk-ant-de-mentira", cabeceras["x-api-key"]
    assert_equal Claude::API_VERSION, cabeceras["anthropic-version"]
    assert_equal "claude-opus-5-5", enviado["model"]
    assert_equal "json_schema", enviado.dig("output_config", "format", "type")
    assert_equal "image", enviado.dig("messages", 0, "content", 0, "type")
  end

  test "los tipos que admiten null viajan como anyOf, sin cambiar el esquema del servicio" do
    enviado = nil
    @stubs.post("/v1/messages") do |env|
      enviado = JSON.parse(env.body)
      [200, { "Content-Type" => "application/json" }, respuesta_de_claude(payload_modelo)]
    end

    extraer
    proveedor = enviado.dig("output_config", "format", "schema", "properties", "provider_name")
    assert_equal [{ "type" => "string" }, { "type" => "null" }], proveedor["anyOf"]
    assert_equal %w[string null], ReceiptExtractionService::SCHEMA.dig(:properties, :provider_name, :type)
  end

  test "con Opus 5.5 pide el fallback del servidor ante un rechazo" do
    cabeceras = nil
    enviado = nil
    @stubs.post("/v1/messages") do |env|
      cabeceras = env.request_headers
      enviado = JSON.parse(env.body)
      [200, { "Content-Type" => "application/json" }, respuesta_de_claude(payload_modelo)]
    end

    extraer
    assert_equal "default", enviado["fallbacks"]
    assert_includes cabeceras["anthropic-beta"], Claude::BETA_FALLBACK
  end

  test "con Haiku no manda fallbacks, que ese modelo no acepta" do
    ENV["RECEIPT_EXTRACTION_MODEL"] = "claude-haiku-5-5"
    enviado = nil
    cabeceras = nil
    @stubs.post("/v1/messages") do |env|
      enviado = JSON.parse(env.body)
      cabeceras = env.request_headers
      [200, { "Content-Type" => "application/json" }, respuesta_de_claude(payload_modelo)]
    end

    extraer
    refute enviado.key?("fallbacks")
    assert_nil cabeceras["anthropic-beta"]
  end

  test "un rechazo de los clasificadores termina en :refusal" do
    @stubs.post("/v1/messages") do
      [200, { "Content-Type" => "application/json" }, respuesta_de_claude("", stop_reason: "refusal")]
    end

    resultado = extraer
    refute resultado.ok?
    assert_equal :refusal, resultado.error
  end

  test "una respuesta sin JSON utilizable termina en :provider_error" do
    @stubs.post("/v1/messages") do
      [200, { "Content-Type" => "application/json" }, respuesta_de_claude("esto no es json")]
    end

    assert_equal :provider_error, extraer.error
  end

  test "un error HTTP de la API termina en :provider_error" do
    @stubs.post("/v1/messages") do
      [529, { "Content-Type" => "application/json" },
       { type: "error", error: { type: "overloaded_error", message: "Overloaded" } }.to_json]
    end

    assert_equal :provider_error, extraer.error
  end

  test "un timeout termina en :timeout" do
    @stubs.post("/v1/messages") { raise Faraday::TimeoutError, "lento" }

    assert_equal :timeout, extraer.error
  end

  test "un PDF viaja como bloque document" do
    enviado = nil
    @stubs.post("/v1/messages") do |env|
      enviado = JSON.parse(env.body)
      [200, { "Content-Type" => "application/json" }, respuesta_de_claude(payload_modelo)]
    end

    extraer("comprobante_factura.pdf")
    bloque = enviado.dig("messages", 0, "content", 0)
    assert_equal "document", bloque["type"]
    assert_equal "application/pdf", bloque.dig("source", "media_type")
  end

  test "configured? exige la api key de Anthropic" do
    assert ReceiptExtractionService.configured?
    ENV.delete("ANTHROPIC_API_KEY")
    refute ReceiptExtractionService.configured?
  end

  test "un archivo gigante se rechaza SIN leerlo a memoria" do
    gigante = Object.new
    def gigante.size = ReceiptExtractionService::MAX_BYTES + 1
    def gigante.read = raise("el archivo no se debe leer: el corte va antes del read")

    resultado = ReceiptExtractionService.extract(gigante)

    assert_equal :too_large, resultado.error
  end
end

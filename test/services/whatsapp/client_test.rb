# frozen_string_literal: true

require "test_helper"

# Cliente HTTP de la Cloud API (paquete 17), contra el adaptador de prueba de
# Faraday: lo que importa es la forma exacta de lo que se le manda a Meta.
class Whatsapp::ClientTest < ActiveSupport::TestCase
  PNID = "1282550828280577"

  setup do
    @stubs = Faraday::Adapter::Test::Stubs.new
    conexion = Faraday.new(url: Whatsapp::GRAPH_HOST) { |f| f.adapter :test, @stubs }
    @client = Whatsapp::Client.new(conexion: conexion, token: "tok", phone_number_id: PNID, version: "v25.0")
  end

  def capturar_envio
    enviado = nil
    @stubs.post("/v25.0/#{PNID}/messages") do |env|
      enviado = JSON.parse(env.body)
      assert_equal "Bearer tok", env.request_headers["Authorization"]
      [200, { "Content-Type" => "application/json" }, { messages: [{ id: "wamid.OUT" }] }.to_json]
    end
    yield
    enviado
  end

  test "envia texto al telefono y devuelve el wamid" do
    wamid = nil
    enviado = capturar_envio { wamid = @client.enviar_texto({ wa_id: "573001234567" }, "Hola") }
    assert_equal "wamid.OUT", wamid
    assert_equal "573001234567", enviado["to"]
    assert_equal "text", enviado["type"]
    assert_equal "Hola", enviado.dig("text", "body")
  end

  test "sin telefono envia al BSUID con recipient" do
    enviado = capturar_envio { @client.enviar_texto({ bsuid: "CO.abc" }, "Hola") }
    assert_nil enviado["to"]
    assert_equal "CO.abc", enviado["recipient"]
  end

  test "los botones se recortan a 3 y a 20 caracteres" do
    botones = (1..4).map { |i| { id: "b#{i}", titulo: "Un titulo demasiado largo #{i}" } }
    enviado = capturar_envio { @client.enviar_botones({ wa_id: "57300" }, "¿Lo registro?", botones) }
    lista = enviado.dig("interactive", "action", "buttons")
    assert_equal 3, lista.size
    assert lista.all? { |b| b.dig("reply", "title").length <= 20 }
    assert_equal "b1", lista.first.dig("reply", "id")
  end

  test "un error de Meta levanta Error con su codigo y dice si es transitorio" do
    @stubs.post("/v25.0/#{PNID}/messages") do
      [400, { "Content-Type" => "application/json" },
       { error: { message: "(#131056) Pair rate limit hit", code: 131_056 } }.to_json]
    end
    error = assert_raises(Whatsapp::Client::Error) { @client.enviar_texto({ wa_id: "57300" }, "x") }
    assert_equal 131_056, error.codigo
    assert error.transitorio?
  end

  test "un 400 por datos invalidos no es transitorio" do
    @stubs.post("/v25.0/#{PNID}/messages") do
      [400, { "Content-Type" => "application/json" }, { error: { message: "Invalid parameter", code: 100 } }.to_json]
    end
    error = assert_raises(Whatsapp::Client::Error) { @client.enviar_texto({ wa_id: "57300" }, "x") }
    refute error.transitorio?
  end

  test "descargar un archivo pide la URL y la baja con el token" do
    @stubs.get("/v25.0/media-1") do
      [200, { "Content-Type" => "application/json" },
       { url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1", mime_type: "application/pdf",
         file_size: 8 }.to_json]
    end
    @stubs.get("https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1") do |env|
      assert_equal "Bearer tok", env.request_headers["Authorization"]
      [200, { "Content-Type" => "application/pdf" }, "%PDF-1.4"]
    end

    descarga = @client.descargar_media("media-1")
    assert_equal "%PDF-1.4", descarga[:bytes]
    assert_equal "application/pdf", descarga[:mime]
  end

  test "un archivo de mas de 20 MB se rechaza sin descargarlo" do
    @stubs.get("/v25.0/media-2") do
      [200, { "Content-Type" => "application/json" },
       { url: "https://lookaside.fbsbx.com/x", mime_type: "application/pdf", file_size: 30.megabytes }.to_json]
    end
    error = assert_raises(Whatsapp::Client::Error) { @client.descargar_media("media-2") }
    refute error.transitorio?
  end
end

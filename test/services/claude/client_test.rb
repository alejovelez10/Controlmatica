# frozen_string_literal: true

require "test_helper"

# Cliente HTTP de Claude y ajuste del esquema (paquete 17).
class Claude::ClientTest < ActiveSupport::TestCase
  setup do
    @stubs = Faraday::Adapter::Test::Stubs.new
    conexion = Faraday.new(url: Claude::API_HOST) { |f| f.adapter :test, @stubs }
    @client = Claude::Client.new(api_key: "sk-ant-x", conexion: conexion)
  end

  test "un 429 y un 529 son transitorios; un 400 no" do
    assert Claude::Client::Error.new("x", status: 429).transitorio?
    assert Claude::Client::Error.new("x", status: 529, tipo: "overloaded_error").transitorio?
    refute Claude::Client::Error.new("x", status: 400, tipo: "invalid_request_error").transitorio?
  end

  test "un error de la API levanta Error con su tipo" do
    @stubs.post("/v1/messages") do
      [400, { "Content-Type" => "application/json" },
       { type: "error", error: { type: "invalid_request_error", message: "max_tokens: muy grande" } }.to_json]
    end
    error = assert_raises(Claude::Client::Error) { @client.mensajes({ model: "claude-haiku-5-5", max_tokens: 10, messages: [] }) }
    assert_equal "invalid_request_error", error.tipo
    assert_equal 400, error.status
  end

  test "las betas que se piden se suman a la del fallback" do
    cabecera = nil
    @stubs.post("/v1/messages") do |env|
      cabecera = env.request_headers["anthropic-beta"]
      [200, { "Content-Type" => "application/json" }, { content: [], stop_reason: "end_turn" }.to_json]
    end
    @client.mensajes({ model: "claude-opus-5-5", max_tokens: 10, messages: [] }, betas: ["otra-beta"])
    assert_equal ["otra-beta", Claude::BETA_FALLBACK], cabecera.split(",")
  end

  test "el esquema convierte los tipos con null a anyOf y deja lo del tipo en su rama" do
    esquema = {
      type: "object",
      properties: {
        nombre: { type: %w[string null], description: "Proveedor" },
        lista: { type: %w[array null], items: { type: "string" } },
        total: { type: "number" }
      }
    }
    compatible = Claude::Esquema.compatible(esquema)
    nombre = compatible.dig("properties", "nombre")
    assert_equal "Proveedor", nombre["description"]
    assert_equal [{ "type" => "string" }, { "type" => "null" }], nombre["anyOf"]
    lista = compatible.dig("properties", "lista", "anyOf")
    assert_equal({ "type" => "array", "items" => { "type" => "string" } }, lista.first)
    assert_equal({ "type" => "number" }, compatible.dig("properties", "total"))
  end
end

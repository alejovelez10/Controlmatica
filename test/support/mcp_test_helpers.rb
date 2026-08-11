# frozen_string_literal: true

# Helpers de las pruebas de tools MCP (paquete 11).
#
# SE AUTOCARGA desde test_helper.rb (`Dir[test/support/**/*.rb]`): ningun test
# hace `require_relative` hacia aqui. Basta con `include McpTestHelpers`.
#
# POR QUE EXISTE `tool_text`: la API de `MCP::Tool::Response` cambia entre
# versiones de la gema `mcp` (hoy 0.22, pinneada como `~> 0.22`). Si todos los
# tests destriparan la respuesta a mano, una actualizacion de la gema obligaria
# a tocar veinte archivos; asi se toca uno.
module McpTestHelpers
  VALID_KEY = "test-mcp-key-0123456789"

  # Setea MCP_API_KEY solo mientras dure el bloque. La restauracion va en
  # `ensure` porque un test que revienta a mitad no puede dejar la key puesta
  # para el resto de la suite.
  def with_mcp_key(key = VALID_KEY)
    previous = ENV["MCP_API_KEY"]
    ENV["MCP_API_KEY"] = key
    yield
  ensure
    ENV["MCP_API_KEY"] = previous
  end

  # Igual que with_mcp_key pero para cualquier variable de entorno (el modo
  # estricto del actor y el kill switch de escrituras se prueban asi).
  def with_env(name, value)
    previous = ENV[name]
    ENV[name] = value
    yield
  ensure
    ENV[name] = previous
  end

  # El server_context tal como lo arma McpController#handle.
  def ctx(api_key: VALID_KEY, actor_email: nil, actor_phone: nil)
    { api_key: api_key, actor_email: actor_email, actor_phone: actor_phone }
  end

  def tool_text(response)
    content = response.respond_to?(:content) ? response.content : response[:content]
    first = Array(content).first
    (first[:text] || first["text"]).to_s
  end

  def tool_json(response)
    JSON.parse(tool_text(response))
  end

  def assert_tool_error(response, fragment)
    assert_includes tool_text(response), fragment
  end
end

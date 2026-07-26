# frozen_string_literal: true

# Servidor MCP de Controlmatica (SDK oficial `mcp`, Streamable HTTP, stateless).
#
# Un único endpoint POST /mcp sirve todo el protocolo JSON-RPC. Se construye un
# MCP::Server fresco por request con el X-Api-Key del header en server_context;
# no hay sesión ni SSE, así cualquier proceso Puma atiende cualquier request.
#
# NO hay que tocar este controller al agregar tools: las auto-descubre desde
# app/tools/*_tool.rb.
class McpController < ActionController::Base
  skip_forgery_protection

  def handle
    server = MCP::Server.new(
      name: "controlmatica",
      version: "1.0.0",
      tools: self.class.mcp_tools,
      server_context: { api_key: request.headers["X-Api-Key"] },
    )

    transport = MCP::Server::Transports::StreamableHTTPTransport.new(
      server,
      stateless: true,
      enable_json_response: true,
    )

    status, headers, body = transport.handle_request(request)
    headers.each { |key, value| response.set_header(key, value) }
    render(
      body: Array(body).join,
      status: status,
      content_type: headers["Content-Type"] || "application/json",
    )
  end

  # Auto-descubre cada tool concreta en app/tools/*_tool.rb (excepto la base),
  # aplicando la política de exposición (solo se registran las tools permitidas).
  def self.mcp_tools
    Dir[Rails.root.join("app/tools/*_tool.rb")].filter_map do |path|
      basename = File.basename(path, ".rb")
      next if basename == "application_tool"

      tool_name = basename.delete_suffix("_tool")
      next unless exposed?(tool_name)

      basename.camelize.constantize
    end
  end

  # Política de exposición.
  #
  # Por ahora se exponen SOLO tools de lectura y creación (list/get/create) más la
  # búsqueda/agregación genérica. Las de editar/eliminar/acciones de dominio (update,
  # delete, change_*, etc.) quedan en el código pero NO se registran → ni aparecen en
  # tools/list ni son invocables por tools/call.
  #
  # Para habilitar también las escrituras destructivas, setear la variable de entorno:
  #   MCP_ENABLE_WRITES=all
  ALWAYS_EXPOSED = %w[records_search records_aggregate].freeze

  def self.exposed?(tool_name)
    return true if ENV["MCP_ENABLE_WRITES"] == "all"
    return true if ALWAYS_EXPOSED.include?(tool_name)

    tool_name.end_with?("_list", "_get", "_create")
  end
end

# frozen_string_literal: true

# Servidor MCP de Controlmatica (SDK oficial `mcp`, Streamable HTTP, stateless).
#
# Un único endpoint POST /mcp sirve todo el protocolo JSON-RPC. Se construye un
# MCP::Server fresco por request con el X-Api-Key (header o query param) en
# server_context; no hay sesión ni SSE, así cualquier proceso Puma atiende
# cualquier request.
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
      server_context: {
        # Preferimos el header (así lo envía Taimes). El fallback por query param
        # existe para clientes que no permiten headers custom, como el diálogo
        # "Add custom connector" de claude.ai, que solo acepta una URL:
        #   https://<host>/mcp?api_key=<MCP_API_KEY>&actor_email=<correo>
        # OJO: la key viaja en la URL y queda en los logs del router → rotarla si
        # se filtra, y preferir el header siempre que el cliente lo soporte.
        api_key: request.headers["X-Api-Key"].presence || params[:api_key],
        # Email del usuario que originó la request en el sistema consumidor
        # (Taimes lo envía como X-Actor-Email). Se usa para resolver el usuario
        # "actor" real por correo (ver ApplicationTool.actor_user); si no llega o
        # no matchea, se cae al Administrador por defecto.
        actor_email: request.headers["X-Actor-Email"].presence || params[:actor_email],
        # Telefono de WhatsApp del usuario que origino la conversacion en Taimes.
        # Llega en cualquier formato ("whatsapp:+573001234567", "+57 300 123 4567")
        # y se normaliza en ApplicationTool.actor_phone (ultimos 10 digitos).
        # Con el, un gasto por WhatsApp queda a nombre de la persona real; sin el,
        # las tools de creacion RECHAZAN en vez de caer al Administrador.
        actor_phone: request.headers["X-Actor-Phone"].presence || params[:actor_phone],
      },
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
  #
  # AQUI SOLO ENTRAN ACCIONES DE DOMINIO QUE NO TERMINAN EN `_list` / `_get` /
  # `_create`: todo lo que termina asi ya se auto-expone abajo y repetirlo en
  # esta lista solo crea dos fuentes de verdad que se desincronizan. Por eso
  # `expense_budgets_list`, `exchange_rates_get`, `expense_rules_list` y
  # `report_expenses_receipt_url_get` NO figuran, aunque son tools nuevas.
  ALWAYS_EXPOSED = %w[
    records_search
    records_aggregate
    expense_budgets_available
    expense_rules_validate
    report_expenses_attach_receipt
    users_find_by_phone
  ].freeze

  def self.exposed?(tool_name)
    return true if ENV["MCP_ENABLE_WRITES"] == "all"
    return true if ALWAYS_EXPOSED.include?(tool_name)

    tool_name.end_with?("_list", "_get", "_create")
  end
end

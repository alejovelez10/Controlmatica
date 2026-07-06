# frozen_string_literal: true

class ProvidersListTool < ApplicationTool
  tool_name "providers_list"
  description "Lista proveedores. Filtro opcional `q` (nombre/nit/email). Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      q:     { type: "string",  description: "Texto a buscar" },
      limit: { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id name nit phone email web address created_at].freeze

  def self.call(server_context:, q: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = q.present? ? Provider.search(q) : Provider.all
    json(Mcp::Serialize.collection(scope.order(:name).limit(limit), KEYS))
  end
end

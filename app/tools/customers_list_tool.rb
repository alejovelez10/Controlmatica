# frozen_string_literal: true

class CustomersListTool < ApplicationTool
  tool_name "customers_list"
  description "Lista clientes. Filtro opcional `q` (busca en nombre/código/nit/email). " \
              "Devuelve hasta `limit` resultados (default 50, máx 200)."
  input_schema(
    properties: {
      q:     { type: "string",  description: "Texto a buscar (nombre, código, nit, email)" },
      limit: { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id name client code nit phone email web address created_at].freeze

  def self.call(server_context:, q: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = q.present? ? Customer.search(q) : Customer.all
    json(Mcp::Serialize.collection(scope.order(:name).limit(limit), KEYS))
  end
end

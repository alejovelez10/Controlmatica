# frozen_string_literal: true

class ParameterizationsListTool < ApplicationTool
  tool_name "parameterizations_list"
  description "Lista parámetros de configuración del sistema (valores de hora, porcentajes, etc.). " \
              "Filtro opcional `q` por nombre."
  input_schema(
    properties: { q: { type: "string", description: "Texto en el nombre del parámetro" } },
    required: []
  )

  KEYS = %i[id name number_value money_value created_at].freeze

  def self.call(server_context:, q: nil, **_ignored)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    scope = q.present? ? Parameterization.search(q) : Parameterization.all
    json(Mcp::Serialize.collection(scope.order(:name), KEYS))
  end
end

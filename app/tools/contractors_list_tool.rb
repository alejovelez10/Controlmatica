# frozen_string_literal: true

class ContractorsListTool < ApplicationTool
  tool_name "contractors_list"
  description "Lista registros de contratistas/tableristas (horas). Filtros opcionales: cost_center_id, " \
              "user_execute_id, q (descripción). Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      cost_center_id:  { type: "integer", description: "Filtra por centro de costo" },
      user_execute_id: { type: "integer", description: "Filtra por usuario que ejecuta las horas" },
      q:               { type: "string",  description: "Texto en la descripción" },
      limit:           { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id cost_center_id user_execute_id user_id sales_number sales_date ammount hours description created_at].freeze

  def self.call(server_context:, cost_center_id: nil, user_execute_id: nil, q: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = Contractor.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    scope = scope.where(user_execute_id: user_execute_id) if user_execute_id
    scope = scope.where("LOWER(description) LIKE ?", "%#{q.downcase}%") if q.present?
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end

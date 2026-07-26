# frozen_string_literal: true

class CommissionsListTool < ApplicationTool
  tool_name "commissions_list"
  description "Lista comisiones. Filtros opcionales: cost_center_id, user_id, is_acepted. " \
              "Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "Filtra por centro de costo" },
      user_id:        { type: "integer", description: "Filtra por usuario de la comisión" },
      is_acepted:     { type: "boolean", description: "Filtra por aceptadas/no aceptadas" },
      limit:          { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id user_id user_invoice_id customer_invoice_id cost_center_id customer_report_id
            value_hour hours_worked total_value start_date end_date observation is_acepted created_at].freeze

  def self.call(server_context:, cost_center_id: nil, user_id: nil, is_acepted: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = Commission.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    scope = scope.where(user_id: user_id) if user_id
    scope = scope.where(is_acepted: is_acepted) unless is_acepted.nil?
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end

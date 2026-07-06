# frozen_string_literal: true

class ExpenseRatiosListTool < ApplicationTool
  tool_name "expense_ratios_list"
  description "Lista relaciones de gastos / anticipos. Filtros opcionales: user_report_id, area. " \
              "Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      user_report_id: { type: "integer", description: "Filtra por usuario que reporta" },
      area:           { type: "string",  description: "Área" },
      limit:          { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id user_report_id user_direction_id area start_date end_date observations anticipo creation_date created_at].freeze

  def self.call(server_context:, user_report_id: nil, area: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = ExpenseRatio.all
    scope = scope.where(user_report_id: user_report_id) if user_report_id
    scope = scope.where(area: area) if area.present?
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end

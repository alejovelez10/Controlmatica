# frozen_string_literal: true

class ShiftsListTool < ApplicationTool
  tool_name "shifts_list"
  description "Lista turnos/agenda. Filtros opcionales: cost_center_id, user_id, y rango de fechas " \
              "(date_from/date_to) por superposición. Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "Filtra por centro de costo" },
      user_id:        { type: "integer", description: "Filtra por usuario asignado" },
      date_from:      { type: "string",  description: "Inicio del rango (YYYY-MM-DD)" },
      date_to:        { type: "string",  description: "Fin del rango (YYYY-MM-DD)" },
      limit:          { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id user_id cost_center_id user_responsible_id start_date end_date subject description color created_at].freeze

  def self.call(server_context:, cost_center_id: nil, user_id: nil, date_from: nil, date_to: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = Shift.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    scope = scope.where(user_id: user_id) if user_id
    scope = scope.where("start_date <= ? AND end_date >= ?", date_to, date_from) if date_from.present? && date_to.present?
    json(Mcp::Serialize.collection(scope.order(start_date: :desc).limit(limit), KEYS))
  end
end

# frozen_string_literal: true

class NotificationAlertsListTool < ApplicationTool
  tool_name "notification_alerts_list"
  description "Lista alertas/notificaciones (desviaciones de costo por módulo). Filtros opcionales: " \
              "cost_center_id, state (booleano), module. Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "Filtra por centro de costo" },
      state:          { type: "boolean", description: "Filtra por estado (leída/no leída)" },
      module:         { type: "string",  description: "Filtra por módulo" },
      limit:          { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id user_id cost_center_id state module description expected real date_update created_at].freeze

  # `module` es palabra reservada en Ruby → se captura vía **args.
  def self.call(server_context:, cost_center_id: nil, state: nil, limit: 50, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    mod = args[:module]
    scope = NotificationAlert.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    scope = scope.where(state: state) unless state.nil?
    scope = scope.where(module: mod) if mod.present?
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end

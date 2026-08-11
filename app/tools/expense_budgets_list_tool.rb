# frozen_string_literal: true

# Partidas presupuestales (cupos de viáticos) para el agente. SOLO LECTURA:
# crear o editar una partida es un acto de autorización de gasto y se hace desde
# la pantalla de Presupuesto, con permisos, no por chat.
class ExpenseBudgetsListTool < ApplicationTool
  tool_name "expense_budgets_list"
  description "Lista las partidas presupuestales (cupos de viáticos) de un centro de costo y/o " \
              "de una persona. Cada fila trae asignado, gastado y disponible del par " \
              "(centro, persona). Los montos son strings decimales en COP. Solo lectura."
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "Filtra por centro de costo" },
      user_id:        { type: "integer", description: "Filtra por persona beneficiaria de la partida" },
      only_active:    { type: "boolean", description: "Si true, solo partidas activas" },
      limit:          { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id cost_center_id user_id amount notes active created_at updated_at].freeze

  def self.call(server_context:, cost_center_id: nil, user_id: nil, only_active: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = ExpenseBudget.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    scope = scope.where(user_id: user_id) if user_id
    # Contra nil y no contra el valor: `if only_active` descartaría el filtro
    # `false`, que es el que sirve para auditar partidas anuladas.
    unless only_active.nil?
      scope = scope.where(active: ActiveModel::Type::Boolean.new.cast(only_active))
    end

    filas = scope.includes(:user, :cost_center).order(created_at: :desc).limit(limit)

    # MEMOIZACIÓN POR PAR (centro, persona), no por fila: asignado/gastado/
    # disponible son del par. Sin esto, 50 filas del mismo par disparan 100
    # consultas agregadas para devolver 50 veces el mismo número.
    cache = {}
    pair = lambda do |cc, u|
      cache[[cc, u]] ||= ExpenseBudgetService.available_for(cost_center_id: cc, user_id: u)
    end

    json(filas.map { |b|
      disponible = pair.call(b.cost_center_id, b.user_id)
      Mcp::Serialize.record(b, KEYS,
                            user_name: b.user&.names,
                            cost_center_code: b.cost_center&.code,
                            assigned: disponible[:assigned].to_s,
                            spent: disponible[:spent].to_s,
                            available: disponible[:available].to_s)
    })
  end
end

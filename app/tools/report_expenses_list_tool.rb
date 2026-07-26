# frozen_string_literal: true

class ReportExpensesListTool < ApplicationTool
  tool_name "report_expenses_list"
  description "Lista gastos/legalizaciones de un centro de costo. Filtros opcionales: cost_center_id, " \
              "user_invoice_id, q (nombre/descripción). Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      cost_center_id:  { type: "integer", description: "Filtra por centro de costo" },
      user_invoice_id: { type: "integer", description: "Filtra por usuario que reporta el gasto" },
      q:               { type: "string",  description: "Texto en nombre o descripción" },
      limit:           { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id cost_center_id user_invoice_id invoice_name invoice_date invoice_number invoice_type
            invoice_value invoice_tax invoice_total description identification
            type_identification_id payment_type_id is_acepted created_at].freeze

  def self.call(server_context:, cost_center_id: nil, user_invoice_id: nil, q: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = ReportExpense.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    scope = scope.where(user_invoice_id: user_invoice_id) if user_invoice_id
    scope = scope.where("LOWER(invoice_name) LIKE :t OR LOWER(description) LIKE :t", t: "%#{q.downcase}%") if q.present?
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end

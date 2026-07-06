# frozen_string_literal: true

# Lookup: opciones de tipo de identificación / tipo de pago para report_expenses.
class ReportExpenseOptionsListTool < ApplicationTool
  tool_name "report_expense_options_list"
  description "Lista las opciones (tipos de identificación y tipos de pago) usadas en los gastos/legalizaciones. " \
              "Filtro opcional `category`. Úsala para obtener type_identification_id y payment_type_id válidos."
  input_schema(
    properties: { category: { type: "string", description: "Filtra por categoría (ej. tipo de identificación / pago)" } },
    required: []
  )

  KEYS = %i[id name category created_at].freeze

  def self.call(server_context:, category: nil, **_ignored)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    scope = ReportExpenseOption.all
    scope = scope.where(category: category) if category.present?
    json(Mcp::Serialize.collection(scope.order(:category, :name), KEYS))
  end
end

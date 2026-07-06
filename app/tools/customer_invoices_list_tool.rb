# frozen_string_literal: true

class CustomerInvoicesListTool < ApplicationTool
  tool_name "customer_invoices_list"
  description "Lista facturas de cliente. Filtros opcionales: cost_center_id, sales_order_id, invoice_state. " \
              "Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "Filtra por centro de costo" },
      sales_order_id: { type: "integer", description: "Filtra por orden" },
      invoice_state:  { type: "string",  description: "Estado de la factura" },
      limit:          { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id cost_center_id sales_order_id number_invoice invoice_value engineering_value
            others_value invoice_date invoice_state created_at].freeze

  def self.call(server_context:, cost_center_id: nil, sales_order_id: nil, invoice_state: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = CustomerInvoice.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    scope = scope.where(sales_order_id: sales_order_id) if sales_order_id
    scope = scope.where(invoice_state: invoice_state) if invoice_state.present?
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end

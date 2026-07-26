# frozen_string_literal: true

class SalesOrdersGetTool < ApplicationTool
  tool_name "sales_orders_get"
  description "Obtiene una orden de compra/venta por ID, con sus facturas de cliente."
  input_schema(
    properties: { id: { type: "integer", description: "ID de la orden" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    so = SalesOrder.find_by(id: id)
    return not_found!("sales_order #{id}") unless so

    invoices = so.customer_invoices.map { |ci| { id: ci.id, number_invoice: ci.number_invoice, invoice_value: ci.invoice_value } }
    json(Mcp::Serialize.record(so, SalesOrdersListTool::KEYS, customer_invoices: invoices))
  end
end

# frozen_string_literal: true

class CustomerInvoicesGetTool < ApplicationTool
  tool_name "customer_invoices_get"
  description "Obtiene una factura de cliente por ID."
  input_schema(
    properties: { id: { type: "integer", description: "ID de la factura" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    ci = CustomerInvoice.find_by(id: id)
    return not_found!("customer_invoice #{id}") unless ci

    json(Mcp::Serialize.record(ci, CustomerInvoicesListTool::KEYS))
  end
end

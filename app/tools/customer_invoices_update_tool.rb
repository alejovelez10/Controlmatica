# frozen_string_literal: true

class CustomerInvoicesUpdateTool < ApplicationTool
  tool_name "customer_invoices_update"
  description "Actualiza una factura de cliente por ID. Solo modifica los campos enviados."
  input_schema(
    properties: {
      id:                { type: "integer", description: "ID de la factura (requerido)" },
      invoice_value:     { type: "number",  description: "Valor de la factura" },
      engineering_value: { type: "number",  description: "Valor de ingeniería" },
      invoice_date:      { type: "string",  description: "Fecha YYYY-MM-DD" },
      number_invoice:    { type: "string",  description: "Número de factura" },
      invoice_state:     { type: "string",  description: "Estado" }
    },
    required: ["id"]
  )

  WRITABLE = %i[invoice_value engineering_value invoice_date number_invoice invoice_state].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    ci = CustomerInvoice.find_by(id: id)
    return not_found!("customer_invoice #{id}") unless ci

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(ci, CustomerInvoicesListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if ci.update(attrs)
        json(Mcp::Serialize.record(ci, CustomerInvoicesListTool::KEYS))
      else
        text("Error: #{ci.errors.full_messages.join(', ')}")
      end
    end
  end
end

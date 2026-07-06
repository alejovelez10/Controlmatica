# frozen_string_literal: true

class CustomerInvoicesCreateTool < ApplicationTool
  tool_name "customer_invoices_create"
  description "Crea una factura de cliente contra una orden. Requiere cost_center_id, sales_order_id e " \
              "invoice_value. Recalcula el estado de facturación del centro de costo."
  input_schema(
    properties: {
      cost_center_id:    { type: "integer", description: "ID del centro de costo (requerido)" },
      sales_order_id:    { type: "integer", description: "ID de la orden (requerido)" },
      invoice_value:     { type: "number",  description: "Valor de la factura (requerido)" },
      engineering_value: { type: "number",  description: "Valor de ingeniería (default 0)" },
      invoice_date:      { type: "string",  description: "Fecha de la factura YYYY-MM-DD (opcional)" },
      number_invoice:    { type: "string",  description: "Número de factura (opcional)" },
      invoice_state:     { type: "string",  description: "Estado (opcional)" }
    },
    required: %w[cost_center_id sales_order_id invoice_value]
  )

  WRITABLE = %i[cost_center_id sales_order_id invoice_value engineering_value invoice_date number_invoice invoice_state].freeze

  def self.call(cost_center_id:, sales_order_id:, invoice_value:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    cc = CostCenter.find_by(id: cost_center_id)
    return not_found!("cost_center #{cost_center_id}") unless cc
    return not_found!("sales_order #{sales_order_id}") unless SalesOrder.exists?(sales_order_id)
    return text("Error: el centro de costo #{cc.code} no tiene valor de cotización (quotation_value) definido.") if cc.quotation_value.nil?

    as_actor(tenant) do
      attrs = args.slice(*WRITABLE).merge(
        cost_center_id: cost_center_id, sales_order_id: sales_order_id, invoice_value: invoice_value.to_f
      )
      attrs[:engineering_value] = attrs[:engineering_value].to_f
      ci = CustomerInvoice.new(attrs)
      if ci.save
        json(Mcp::Serialize.record(ci, CustomerInvoicesListTool::KEYS))
      else
        text("Error: #{ci.errors.full_messages.join(', ')}")
      end
    end
  end
end

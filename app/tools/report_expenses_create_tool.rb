# frozen_string_literal: true

class ReportExpensesCreateTool < ApplicationTool
  tool_name "report_expenses_create"
  description "Registra un gasto/legalización en un centro de costo. Requiere cost_center_id y user_invoice_id. " \
              "Los valores (invoice_value/tax/total) son opcionales. Usa report_expense_options_list para " \
              "obtener type_identification_id y payment_type_id válidos."
  input_schema(
    properties: {
      cost_center_id:         { type: "integer", description: "ID del centro de costo (requerido)" },
      user_invoice_id:        { type: "integer", description: "ID del usuario que reporta el gasto (requerido)" },
      invoice_name:           { type: "string",  description: "Nombre/proveedor de la factura (opcional)" },
      invoice_number:         { type: "string",  description: "Número de factura (opcional)" },
      invoice_type:           { type: "string",  description: "Tipo de factura (opcional)" },
      invoice_date:           { type: "string",  description: "Fecha de la factura YYYY-MM-DD (opcional)" },
      invoice_value:          { type: "number",  description: "Valor base (opcional)" },
      invoice_tax:            { type: "number",  description: "IVA (opcional)" },
      invoice_total:          { type: "number",  description: "Total (opcional)" },
      identification:         { type: "string",  description: "NIT/identificación (opcional)" },
      description:            { type: "string",  description: "Descripción (opcional)" },
      type_identification_id: { type: "integer", description: "ID de opción tipo de identificación (opcional)" },
      payment_type_id:        { type: "integer", description: "ID de opción tipo de pago (opcional)" }
    },
    required: %w[cost_center_id user_invoice_id]
  )

  WRITABLE = %i[cost_center_id user_invoice_id invoice_name invoice_number invoice_type invoice_date
                invoice_value invoice_tax invoice_total identification description
                type_identification_id payment_type_id].freeze

  def self.call(cost_center_id:, user_invoice_id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant
    return not_found!("cost_center #{cost_center_id}") unless CostCenter.exists?(cost_center_id)
    return not_found!("user #{user_invoice_id}") unless User.exists?(user_invoice_id)

    as_actor(tenant) do |actor|
      attrs = args.slice(*WRITABLE).merge(cost_center_id: cost_center_id, user_invoice_id: user_invoice_id)
      re = ReportExpense.new(attrs)
      re.user_id = actor&.id if re.respond_to?(:user_id=)
      if re.save
        json(Mcp::Serialize.record(re, ReportExpensesListTool::KEYS))
      else
        text("Error: #{re.errors.full_messages.join(', ')}")
      end
    end
  end
end

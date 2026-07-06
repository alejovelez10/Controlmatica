# frozen_string_literal: true

class CommissionsCreateTool < ApplicationTool
  tool_name "commissions_create"
  description "Crea una comisión. Requiere user_id, user_invoice_id, customer_invoice_id y cost_center_id. " \
              "El total se calcula como value_hour × hours_worked × (% de comisión parametrizado)."
  input_schema(
    properties: {
      user_id:            { type: "integer", description: "ID del usuario de la comisión (requerido)" },
      user_invoice_id:    { type: "integer", description: "ID del usuario que factura (requerido)" },
      customer_invoice_id:{ type: "integer", description: "ID de la factura de cliente (requerido)" },
      cost_center_id:     { type: "integer", description: "ID del centro de costo (requerido)" },
      value_hour:         { type: "number",  description: "Valor hora (default 0)" },
      hours_worked:       { type: "number",  description: "Horas trabajadas (default 0)" },
      start_date:         { type: "string",  description: "Fecha inicio YYYY-MM-DD (opcional)" },
      end_date:           { type: "string",  description: "Fecha fin YYYY-MM-DD (opcional)" },
      observation:        { type: "string",  description: "Observación (opcional)" },
      customer_report_id: { type: "integer", description: "ID del informe de cliente (opcional)" }
    },
    required: %w[user_id user_invoice_id customer_invoice_id cost_center_id]
  )

  WRITABLE = %i[user_id user_invoice_id customer_invoice_id cost_center_id value_hour
                hours_worked start_date end_date observation customer_report_id].freeze

  def self.call(user_id:, user_invoice_id:, customer_invoice_id:, cost_center_id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant
    return not_found!("cost_center #{cost_center_id}") unless CostCenter.exists?(cost_center_id)
    return not_found!("customer_invoice #{customer_invoice_id}") unless CustomerInvoice.exists?(customer_invoice_id)
    if Parameterization.find_by(name: "PORCENTAJE DE COMISION").nil?
      return text("Error: falta el parámetro 'PORCENTAJE DE COMISION'; configúralo antes de crear comisiones.")
    end

    as_actor(tenant) do
      attrs = args.slice(*WRITABLE).merge(
        user_id: user_id, user_invoice_id: user_invoice_id,
        customer_invoice_id: customer_invoice_id, cost_center_id: cost_center_id
      )
      attrs[:value_hour] = attrs[:value_hour].to_f
      attrs[:hours_worked] = attrs[:hours_worked].to_f
      c = Commission.new(attrs)
      if c.save
        json(Mcp::Serialize.record(c, CommissionsListTool::KEYS))
      else
        text("Error: #{c.errors.full_messages.join(', ')}")
      end
    end
  end
end

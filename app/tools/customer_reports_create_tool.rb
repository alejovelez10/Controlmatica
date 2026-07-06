# frozen_string_literal: true

class CustomerReportsCreateTool < ApplicationTool
  tool_name "customer_reports_create"
  description "Crea un informe de cliente (para aprobación) sobre un centro de costo. Requiere cost_center_id. " \
              "Genera automáticamente token y código. Opcionalmente asocia reportes de servicio con report_ids."
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "ID del centro de costo (requerido)" },
      customer_id:    { type: "integer", description: "ID del cliente (opcional)" },
      contact_id:     { type: "integer", description: "ID del contacto (opcional)" },
      report_date:    { type: "string",  description: "Fecha del informe YYYY-MM-DD (opcional)" },
      description:    { type: "string",  description: "Descripción (opcional)" },
      email:          { type: "string",  description: "Email de envío (opcional)" },
      report_ids:     { type: "array", items: { type: "integer" }, description: "IDs de reportes de servicio a incluir (opcional)" }
    },
    required: %w[cost_center_id]
  )

  WRITABLE = %i[cost_center_id customer_id contact_id report_date description email].freeze

  def self.call(cost_center_id:, server_context:, report_ids: nil, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    cc = CostCenter.find_by(id: cost_center_id)
    return not_found!("cost_center #{cost_center_id}") unless cc

    as_actor(tenant) do |actor|
      attrs = args.slice(*WRITABLE).merge(cost_center_id: cost_center_id)
      attrs[:customer_id] ||= cc.customer_id
      cr = CustomerReport.new(attrs)
      cr.user_id = actor&.id if cr.respond_to?(:user_id=)
      cr.reports = Report.where(id: report_ids) if report_ids.present?
      if cr.save
        json(Mcp::Serialize.record(cr, CustomerReportsListTool::KEYS))
      else
        text("Error: #{cr.errors.full_messages.join(', ')}")
      end
    end
  end
end

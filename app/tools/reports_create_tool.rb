# frozen_string_literal: true

class ReportsCreateTool < ApplicationTool
  tool_name "reports_create"
  description "Crea un reporte de servicio en un centro de costo. Requiere cost_center_id, customer_id, " \
              "report_execute_id y report_date (YYYY-MM-DD). working_value/total_value se calculan a partir " \
              "de working_time × valor hora del centro. viatic_value y displacement_hours default 0."
  input_schema(
    properties: {
      cost_center_id:     { type: "integer", description: "ID del centro de costo (requerido)" },
      customer_id:        { type: "integer", description: "ID del cliente (requerido)" },
      report_execute_id:  { type: "integer", description: "ID del usuario que ejecuta (requerido)" },
      report_date:        { type: "string",  description: "Fecha del reporte YYYY-MM-DD (requerido)" },
      contact_id:         { type: "integer", description: "ID del contacto (opcional)" },
      working_time:       { type: "number",  description: "Horas trabajadas (default 0)" },
      displacement_hours: { type: "number",  description: "Horas de desplazamiento (default 0)" },
      viatic_value:       { type: "number",  description: "Valor viáticos (default 0)" },
      work_description:   { type: "string",  description: "Descripción del trabajo (opcional)" },
      viatic_description: { type: "string",  description: "Descripción de viáticos (opcional)" }
    },
    required: %w[cost_center_id customer_id report_execute_id report_date]
  )

  WRITABLE = %i[cost_center_id customer_id report_execute_id report_date contact_id
                working_time displacement_hours viatic_value work_description viatic_description].freeze

  def self.call(cost_center_id:, customer_id:, report_execute_id:, report_date:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    cc = CostCenter.find_by(id: cost_center_id)
    return not_found!("cost_center #{cost_center_id}") unless cc
    return not_found!("customer #{customer_id}") unless Customer.exists?(customer_id)
    return not_found!("user #{report_execute_id}") unless User.exists?(report_execute_id)
    return text("Error: el centro de costo #{cc.code} no tiene 'valor hora' (hour_real) definido.") if cc.hour_real.nil?
    return text("Error: el centro de costo #{cc.code} no tiene cliente asociado.") if cc.customer.nil?

    as_actor(tenant) do |actor|
      attrs = args.slice(*WRITABLE).merge(
        cost_center_id: cost_center_id, customer_id: customer_id,
        report_execute_id: report_execute_id, report_date: report_date
      )
      attrs[:working_time] = attrs[:working_time].to_f
      attrs[:displacement_hours] = attrs[:displacement_hours].to_f
      attrs[:viatic_value] = attrs[:viatic_value].to_f
      r = Report.new(attrs)
      r.user_id = actor&.id if r.respond_to?(:user_id=)
      if r.save
        json(Mcp::Serialize.record(r, ReportsListTool::KEYS))
      else
        text("Error: #{r.errors.full_messages.join(', ')}")
      end
    end
  end
end

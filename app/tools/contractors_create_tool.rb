# frozen_string_literal: true

class ContractorsCreateTool < ApplicationTool
  tool_name "contractors_create"
  description "Registra horas de contratista/tablerista en un centro de costo. Requiere cost_center_id, " \
              "user_execute_id y hours. El valor (ammount) se calcula como horas × valor hora del centro."
  input_schema(
    properties: {
      cost_center_id:  { type: "integer", description: "ID del centro de costo (requerido)" },
      user_execute_id: { type: "integer", description: "ID del usuario que ejecuta las horas (requerido)" },
      hours:           { type: "number",  description: "Horas trabajadas (requerido)" },
      sales_number:    { type: "string",  description: "Número/consecutivo (opcional)" },
      sales_date:      { type: "string",  description: "Fecha YYYY-MM-DD (opcional)" },
      description:     { type: "string",  description: "Descripción (opcional)" }
    },
    required: %w[cost_center_id user_execute_id hours]
  )

  WRITABLE = %i[cost_center_id user_execute_id hours sales_number sales_date description].freeze

  def self.call(cost_center_id:, user_execute_id:, hours:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    cc = CostCenter.find_by(id: cost_center_id)
    return not_found!("cost_center #{cost_center_id}") unless cc
    return not_found!("user #{user_execute_id}") unless User.exists?(user_execute_id)
    if cc.hours_contractor_real.nil?
      return text("Error: el centro de costo #{cc.code} no tiene 'valor hora contratista' (hours_contractor_real) " \
                  "definido; actualízalo antes de registrar horas de contratista.")
    end

    as_actor(tenant) do |actor|
      attrs = args.slice(*WRITABLE).merge(
        cost_center_id: cost_center_id, user_execute_id: user_execute_id, hours: hours.to_f
      )
      c = Contractor.new(attrs)
      c.user_id = actor&.id if c.respond_to?(:user_id=)
      c.update_user = actor&.id if c.respond_to?(:update_user=)
      if c.save
        json(Mcp::Serialize.record(c, ContractorsListTool::KEYS))
      else
        text("Error: #{c.errors.full_messages.join(', ')}")
      end
    end
  end
end

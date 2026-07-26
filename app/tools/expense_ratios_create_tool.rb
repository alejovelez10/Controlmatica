# frozen_string_literal: true

class ExpenseRatiosCreateTool < ApplicationTool
  tool_name "expense_ratios_create"
  description "Crea una relación de gastos / anticipo. Requiere user_report_id y user_direction_id."
  input_schema(
    properties: {
      user_report_id:    { type: "integer", description: "ID del usuario que reporta (requerido)" },
      user_direction_id: { type: "integer", description: "ID del usuario de dirección (requerido)" },
      area:              { type: "string",  description: "Área (opcional)" },
      start_date:        { type: "string",  description: "Fecha inicio YYYY-MM-DD (opcional)" },
      end_date:          { type: "string",  description: "Fecha fin YYYY-MM-DD (opcional)" },
      creation_date:     { type: "string",  description: "Fecha de creación YYYY-MM-DD (opcional)" },
      observations:      { type: "string",  description: "Observaciones (opcional)" },
      anticipo:          { type: "number",  description: "Valor del anticipo (opcional)" }
    },
    required: %w[user_report_id user_direction_id]
  )

  WRITABLE = %i[user_report_id user_direction_id area start_date end_date creation_date observations anticipo].freeze

  def self.call(user_report_id:, user_direction_id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant
    return not_found!("user #{user_report_id}") unless User.exists?(user_report_id)
    return not_found!("user #{user_direction_id}") unless User.exists?(user_direction_id)

    as_actor(tenant) do |actor|
      attrs = args.slice(*WRITABLE).merge(user_report_id: user_report_id, user_direction_id: user_direction_id)
      er = ExpenseRatio.new(attrs)
      er.user_id = actor&.id if er.respond_to?(:user_id=)
      if er.save
        json(Mcp::Serialize.record(er, ExpenseRatiosListTool::KEYS))
      else
        text("Error: #{er.errors.full_messages.join(', ')}")
      end
    end
  end
end

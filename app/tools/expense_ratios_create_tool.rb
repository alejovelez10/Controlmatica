# frozen_string_literal: true

class ExpenseRatiosCreateTool < ApplicationTool
  tool_name "expense_ratios_create"
  description "Crea una relación de gastos / anticipo. Requiere user_direction_id. " \
              "user_report_id (quién reporta) es opcional: si se omite, se toma el usuario del correo del actor (X-Actor-Email)."
  input_schema(
    properties: {
      user_report_id:    { type: "integer", description: "ID del usuario que reporta (opcional; por defecto el usuario del correo del actor)" },
      user_direction_id: { type: "integer", description: "ID del usuario de dirección (requerido)" },
      area:              { type: "string",  description: "Área (opcional)" },
      start_date:        { type: "string",  description: "Fecha inicio YYYY-MM-DD (opcional)" },
      end_date:          { type: "string",  description: "Fecha fin YYYY-MM-DD (opcional)" },
      creation_date:     { type: "string",  description: "Fecha de creación YYYY-MM-DD (opcional)" },
      observations:      { type: "string",  description: "Observaciones (opcional)" },
      anticipo:          { type: "number",  description: "Valor del anticipo (opcional)" }
    },
    required: %w[user_direction_id]
  )

  WRITABLE = %i[user_report_id user_direction_id area start_date end_date creation_date observations anticipo].freeze

  def self.call(user_direction_id:, server_context:, user_report_id: nil, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant
    return not_found!("user #{user_direction_id}") unless User.exists?(user_direction_id)

    as_actor(tenant, server_context) do |actor|
      # user_report_id (quién reporta) por defecto = el actor resuelto por correo.
      resolved_report_id = user_report_id || actor&.id
      unless resolved_report_id
        return text("Error: no se pudo determinar el usuario que reporta. Indica user_report_id " \
                    "o asegúrate de que tu correo exista como usuario en Controlmatica.")
      end
      return not_found!("user #{resolved_report_id}") unless User.exists?(resolved_report_id)

      attrs = args.slice(*WRITABLE).merge(user_report_id: resolved_report_id, user_direction_id: user_direction_id)
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

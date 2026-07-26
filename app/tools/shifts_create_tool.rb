# frozen_string_literal: true

class ShiftsCreateTool < ApplicationTool
  tool_name "shifts_create"
  description "Crea un turno/agenda. Requiere user_id, cost_center_id, start_date y end_date (datetime ISO8601)."
  input_schema(
    properties: {
      user_id:             { type: "integer", description: "ID del usuario asignado (requerido)" },
      cost_center_id:      { type: "integer", description: "ID del centro de costo (requerido)" },
      start_date:          { type: "string",  description: "Inicio (YYYY-MM-DD HH:MM o ISO8601) (requerido)" },
      end_date:            { type: "string",  description: "Fin (YYYY-MM-DD HH:MM o ISO8601) (requerido)" },
      user_responsible_id: { type: "integer", description: "ID del usuario responsable (opcional)" },
      subject:             { type: "string",  description: "Asunto/título (opcional)" },
      description:         { type: "string",  description: "Descripción (opcional)" },
      color:               { type: "string",  description: "Color para el calendario (opcional)" }
    },
    required: %w[user_id cost_center_id start_date end_date]
  )

  WRITABLE = %i[user_id cost_center_id start_date end_date user_responsible_id subject description color].freeze

  def self.call(user_id:, cost_center_id:, start_date:, end_date:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant
    return not_found!("user #{user_id}") unless User.exists?(user_id)
    return not_found!("cost_center #{cost_center_id}") unless CostCenter.exists?(cost_center_id)

    as_actor(tenant) do
      attrs = args.slice(*WRITABLE).merge(
        user_id: user_id, cost_center_id: cost_center_id, start_date: start_date, end_date: end_date
      )
      s = Shift.new(attrs)
      if s.save
        json(Mcp::Serialize.record(s, ShiftsListTool::KEYS))
      else
        text("Error: #{s.errors.full_messages.join(', ')}")
      end
    end
  end
end

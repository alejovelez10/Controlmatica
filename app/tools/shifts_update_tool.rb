# frozen_string_literal: true

class ShiftsUpdateTool < ApplicationTool
  tool_name "shifts_update"
  description "Actualiza un turno por ID. Solo modifica los campos enviados."
  input_schema(
    properties: {
      id:                  { type: "integer", description: "ID del turno (requerido)" },
      start_date:          { type: "string",  description: "Inicio (datetime)" },
      end_date:            { type: "string",  description: "Fin (datetime)" },
      user_id:             { type: "integer", description: "ID del usuario asignado" },
      user_responsible_id: { type: "integer", description: "ID del usuario responsable" },
      subject:             { type: "string",  description: "Asunto/título" },
      description:         { type: "string",  description: "Descripción" },
      color:               { type: "string",  description: "Color" }
    },
    required: ["id"]
  )

  WRITABLE = %i[start_date end_date user_id user_responsible_id subject description color].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    s = Shift.find_by(id: id)
    return not_found!("shift #{id}") unless s

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(s, ShiftsListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if s.update(attrs)
        json(Mcp::Serialize.record(s, ShiftsListTool::KEYS))
      else
        text("Error: #{s.errors.full_messages.join(', ')}")
      end
    end
  end
end

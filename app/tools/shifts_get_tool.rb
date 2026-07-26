# frozen_string_literal: true

class ShiftsGetTool < ApplicationTool
  tool_name "shifts_get"
  description "Obtiene un turno por ID."
  input_schema(
    properties: { id: { type: "integer", description: "ID del turno" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    s = Shift.find_by(id: id)
    return not_found!("shift #{id}") unless s

    json(Mcp::Serialize.record(s, ShiftsListTool::KEYS))
  end
end

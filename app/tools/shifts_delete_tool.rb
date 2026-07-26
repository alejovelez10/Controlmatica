# frozen_string_literal: true

class ShiftsDeleteTool < ApplicationTool
  tool_name "shifts_delete"
  description "Elimina un turno por ID. Devuelve confirmación."
  input_schema(
    properties: { id: { type: "integer", description: "ID del turno a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    s = Shift.find_by(id: id)
    return not_found!("shift #{id}") unless s

    as_actor(tenant) do
      s.destroy
      json({ deleted: true, id: id })
    end
  end
end

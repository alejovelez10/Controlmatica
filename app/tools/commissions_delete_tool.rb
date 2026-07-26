# frozen_string_literal: true

class CommissionsDeleteTool < ApplicationTool
  tool_name "commissions_delete"
  description "Elimina una comisión por ID. Devuelve confirmación."
  input_schema(
    properties: { id: { type: "integer", description: "ID de la comisión a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    c = Commission.find_by(id: id)
    return not_found!("commission #{id}") unless c

    as_actor(tenant) do
      c.destroy
      json({ deleted: true, id: id })
    end
  end
end

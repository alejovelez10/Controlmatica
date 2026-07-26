# frozen_string_literal: true

class ContractorsDeleteTool < ApplicationTool
  tool_name "contractors_delete"
  description "Elimina un registro de contratista/tablerista por ID. Recalcula totales del centro de costo."
  input_schema(
    properties: { id: { type: "integer", description: "ID del registro a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    c = Contractor.find_by(id: id)
    return not_found!("contractor #{id}") unless c

    as_actor(tenant) do
      cc_id = c.cost_center_id
      c.destroy
      json({ deleted: true, id: id, cost_center_id: cc_id })
    end
  end
end

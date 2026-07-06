# frozen_string_literal: true

class MaterialsDeleteTool < ApplicationTool
  tool_name "materials_delete"
  description "Elimina un material/compra por ID. Recalcula los totales del centro de costo. Devuelve confirmación."
  input_schema(
    properties: { id: { type: "integer", description: "ID del material a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    m = Material.find_by(id: id)
    return not_found!("material #{id}") unless m

    as_actor(tenant) do
      cc_id = m.cost_center_id
      m.destroy
      json({ deleted: true, id: id, cost_center_id: cc_id })
    end
  end
end

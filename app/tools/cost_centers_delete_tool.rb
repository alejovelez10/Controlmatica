# frozen_string_literal: true

# Elimina un centro de costo por id. El callback after_destroy estampa un registro
# de auditoría que depende de User.current, por eso se envuelve en `as_actor`.
class CostCentersDeleteTool < ApplicationTool
  tool_name "cost_centers_delete"
  description "Elimina un centro de costo por ID (y sus relaciones dependientes: reportes, " \
              "materiales, contratistas, etc.). Devuelve confirmación con el id eliminado."
  input_schema(
    properties: { id: { type: "integer", description: "ID del centro de costo a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    cc = CostCenter.find_by(id: id)
    return not_found!("cost_center #{id}") unless cc

    as_actor(tenant) do
      code = cc.code
      cc.destroy
      json({ deleted: true, id: id, code: code })
    end
  end
end

# frozen_string_literal: true

class MaterialInvoicesDeleteTool < ApplicationTool
  tool_name "material_invoices_delete"
  description "Elimina una factura de proveedor (de material) por ID. Actualiza el valor facturado del material."
  input_schema(
    properties: { id: { type: "integer", description: "ID de la factura a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    mi = MaterialInvoice.find_by(id: id)
    return not_found!("material_invoice #{id}") unless mi

    as_actor(tenant) do
      material_id = mi.material_id
      mi.destroy
      json({ deleted: true, id: id, material_id: material_id })
    end
  end
end

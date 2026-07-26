# frozen_string_literal: true

class MaterialsGetTool < ApplicationTool
  tool_name "materials_get"
  description "Obtiene un material/compra por ID, con sus facturas de proveedor."
  input_schema(
    properties: { id: { type: "integer", description: "ID del material" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    m = Material.find_by(id: id)
    return not_found!("material #{id}") unless m

    invoices = m.material_invoices.map { |mi| { id: mi.id, number: mi.number, value: mi.value } }
    json(Mcp::Serialize.record(m, MaterialsListTool::KEYS, material_invoices: invoices))
  end
end

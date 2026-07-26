# frozen_string_literal: true

class MaterialInvoicesGetTool < ApplicationTool
  tool_name "material_invoices_get"
  description "Obtiene una factura de proveedor (de material) por ID."
  input_schema(
    properties: { id: { type: "integer", description: "ID de la factura de material" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    mi = MaterialInvoice.find_by(id: id)
    return not_found!("material_invoice #{id}") unless mi

    json(Mcp::Serialize.record(mi, MaterialInvoicesListTool::KEYS))
  end
end

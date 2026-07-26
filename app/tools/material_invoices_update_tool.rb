# frozen_string_literal: true

class MaterialInvoicesUpdateTool < ApplicationTool
  tool_name "material_invoices_update"
  description "Actualiza una factura de proveedor (de material) por ID. Solo modifica los campos enviados."
  input_schema(
    properties: {
      id:          { type: "integer", description: "ID de la factura (requerido)" },
      value:       { type: "number",  description: "Valor de la factura" },
      number:      { type: "string",  description: "Número de factura" },
      observation: { type: "string",  description: "Observación" }
    },
    required: ["id"]
  )

  WRITABLE = %i[value number observation].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    mi = MaterialInvoice.find_by(id: id)
    return not_found!("material_invoice #{id}") unless mi

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(mi, MaterialInvoicesListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if mi.update(attrs)
        json(Mcp::Serialize.record(mi, MaterialInvoicesListTool::KEYS))
      else
        text("Error: #{mi.errors.full_messages.join(', ')}")
      end
    end
  end
end

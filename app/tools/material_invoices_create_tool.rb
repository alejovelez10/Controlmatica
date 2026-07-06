# frozen_string_literal: true

class MaterialInvoicesCreateTool < ApplicationTool
  tool_name "material_invoices_create"
  description "Registra una factura de proveedor sobre un material. Requiere material_id y value. " \
              "Actualiza el valor facturado del material."
  input_schema(
    properties: {
      material_id: { type: "integer", description: "ID del material (requerido)" },
      value:       { type: "number",  description: "Valor de la factura (requerido)" },
      number:      { type: "string",  description: "Número de factura (opcional)" },
      observation: { type: "string",  description: "Observación (opcional)" }
    },
    required: %w[material_id value]
  )

  WRITABLE = %i[material_id value number observation].freeze

  def self.call(material_id:, value:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant
    return not_found!("material #{material_id}") unless Material.exists?(material_id)

    as_actor(tenant) do |actor|
      attrs = args.slice(*WRITABLE).merge(material_id: material_id, value: value.to_f)
      mi = MaterialInvoice.new(attrs)
      mi.user_id = actor&.id if mi.respond_to?(:user_id=)
      if mi.save
        json(Mcp::Serialize.record(mi, MaterialInvoicesListTool::KEYS))
      else
        text("Error: #{mi.errors.full_messages.join(', ')}")
      end
    end
  end
end

# frozen_string_literal: true

class MaterialsUpdateTool < ApplicationTool
  tool_name "materials_update"
  description "Actualiza un material/compra por ID. Solo modifica los campos enviados. " \
              "Recalcula los totales del centro de costo."
  input_schema(
    properties: {
      id:            { type: "integer", description: "ID del material (requerido)" },
      provider_id:   { type: "integer", description: "ID del proveedor" },
      amount:        { type: "number",  description: "Valor de la compra" },
      sales_number:  { type: "string",  description: "Número de orden" },
      sales_date:    { type: "string",  description: "Fecha de orden YYYY-MM-DD" },
      delivery_date: { type: "string",  description: "Fecha de entrega YYYY-MM-DD" },
      description:   { type: "string",  description: "Descripción" },
      sales_state:   { type: "string",  description: "Estado de compra" }
    },
    required: ["id"]
  )

  WRITABLE = %i[provider_id amount sales_number sales_date delivery_date description sales_state].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    m = Material.find_by(id: id)
    return not_found!("material #{id}") unless m

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(m, MaterialsListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      m.update_user = actor_user(tenant)&.id if m.respond_to?(:update_user=)
      if m.update(attrs)
        json(Mcp::Serialize.record(m, MaterialsListTool::KEYS))
      else
        text("Error: #{m.errors.full_messages.join(', ')}")
      end
    end
  end
end

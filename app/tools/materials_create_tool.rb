# frozen_string_literal: true

class MaterialsCreateTool < ApplicationTool
  tool_name "materials_create"
  description "Crea un material/compra en un centro de costo. Requiere cost_center_id y provider_id. " \
              "amount default 0. Recalcula automáticamente los totales del centro de costo."
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "ID del centro de costo (requerido)" },
      provider_id:    { type: "integer", description: "ID del proveedor (requerido)" },
      amount:         { type: "number",  description: "Valor de la compra (default 0)" },
      sales_number:   { type: "string",  description: "Número de orden (opcional)" },
      sales_date:     { type: "string",  description: "Fecha de orden YYYY-MM-DD (opcional)" },
      delivery_date:  { type: "string",  description: "Fecha estimada de entrega YYYY-MM-DD (opcional)" },
      description:    { type: "string",  description: "Descripción (opcional)" },
      sales_state:    { type: "string",  description: "Estado de compra (opcional)" }
    },
    required: %w[cost_center_id provider_id]
  )

  WRITABLE = %i[cost_center_id provider_id amount sales_number sales_date delivery_date description sales_state].freeze

  def self.call(cost_center_id:, provider_id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant
    return not_found!("cost_center #{cost_center_id}") unless CostCenter.exists?(cost_center_id)
    return not_found!("provider #{provider_id}") unless Provider.exists?(provider_id)

    as_actor(tenant) do |actor|
      attrs = args.slice(*WRITABLE).merge(cost_center_id: cost_center_id, provider_id: provider_id)
      attrs[:amount] = attrs[:amount].to_f
      m = Material.new(attrs)
      m.user_id = actor&.id if m.respond_to?(:user_id=)
      if m.save
        json(Mcp::Serialize.record(m, MaterialsListTool::KEYS))
      else
        text("Error: #{m.errors.full_messages.join(', ')}")
      end
    end
  end
end

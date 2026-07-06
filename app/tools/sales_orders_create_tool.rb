# frozen_string_literal: true

class SalesOrdersCreateTool < ApplicationTool
  tool_name "sales_orders_create"
  description "Crea una orden de compra/venta en un centro de costo. Requiere cost_center_id. " \
              "order_value default 0. Recalcula el estado de facturación del centro de costo."
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "ID del centro de costo (requerido)" },
      order_number:   { type: "string",  description: "Número de orden (opcional)" },
      order_value:    { type: "number",  description: "Valor de la orden (default 0)" },
      created_date:   { type: "string",  description: "Fecha de la orden YYYY-MM-DD (opcional)" },
      state:          { type: "string",  description: "Estado (opcional)" },
      description:    { type: "string",  description: "Descripción (opcional)" }
    },
    required: %w[cost_center_id]
  )

  WRITABLE = %i[cost_center_id order_number order_value created_date state description].freeze

  def self.call(cost_center_id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant
    return not_found!("cost_center #{cost_center_id}") unless CostCenter.exists?(cost_center_id)

    as_actor(tenant) do |actor|
      attrs = args.slice(*WRITABLE).merge(cost_center_id: cost_center_id)
      attrs[:order_value] = attrs[:order_value].to_f
      so = SalesOrder.new(attrs)
      so.user_id = actor&.id if so.respond_to?(:user_id=)
      if so.save
        json(Mcp::Serialize.record(so, SalesOrdersListTool::KEYS))
      else
        text("Error: #{so.errors.full_messages.join(', ')}")
      end
    end
  end
end

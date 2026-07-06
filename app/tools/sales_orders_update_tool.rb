# frozen_string_literal: true

class SalesOrdersUpdateTool < ApplicationTool
  tool_name "sales_orders_update"
  description "Actualiza una orden de compra/venta por ID. Solo modifica los campos enviados."
  input_schema(
    properties: {
      id:           { type: "integer", description: "ID de la orden (requerido)" },
      order_number: { type: "string",  description: "Número de orden" },
      order_value:  { type: "number",  description: "Valor de la orden" },
      created_date: { type: "string",  description: "Fecha de la orden YYYY-MM-DD" },
      state:        { type: "string",  description: "Estado" },
      description:  { type: "string",  description: "Descripción" }
    },
    required: ["id"]
  )

  WRITABLE = %i[order_number order_value created_date state description].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    so = SalesOrder.find_by(id: id)
    return not_found!("sales_order #{id}") unless so

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(so, SalesOrdersListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if so.update(attrs)
        json(Mcp::Serialize.record(so, SalesOrdersListTool::KEYS))
      else
        text("Error: #{so.errors.full_messages.join(', ')}")
      end
    end
  end
end

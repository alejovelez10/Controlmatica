# frozen_string_literal: true

class SalesOrdersDeleteTool < ApplicationTool
  tool_name "sales_orders_delete"
  description "Elimina una orden de compra/venta por ID (y sus facturas de cliente dependientes). " \
              "Recalcula el estado del centro de costo. Devuelve confirmación."
  input_schema(
    properties: { id: { type: "integer", description: "ID de la orden a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    so = SalesOrder.find_by(id: id)
    return not_found!("sales_order #{id}") unless so

    as_actor(tenant) do
      cc_id = so.cost_center_id
      so.destroy
      json({ deleted: true, id: id, cost_center_id: cc_id })
    end
  end
end

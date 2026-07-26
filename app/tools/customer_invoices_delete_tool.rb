# frozen_string_literal: true

class CustomerInvoicesDeleteTool < ApplicationTool
  tool_name "customer_invoices_delete"
  description "Elimina una factura de cliente por ID. Recalcula el estado del centro de costo. Devuelve confirmación."
  input_schema(
    properties: { id: { type: "integer", description: "ID de la factura a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    ci = CustomerInvoice.find_by(id: id)
    return not_found!("customer_invoice #{id}") unless ci

    as_actor(tenant) do
      cc_id = ci.cost_center_id
      ci.destroy
      json({ deleted: true, id: id, cost_center_id: cc_id })
    end
  end
end

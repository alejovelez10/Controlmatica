# frozen_string_literal: true

class CustomersDeleteTool < ApplicationTool
  tool_name "customers_delete"
  description "Elimina un cliente por ID (y sus contactos/reportes dependientes). " \
              "Falla si tiene datos que impidan el borrado. Devuelve confirmación."
  input_schema(
    properties: { id: { type: "integer", description: "ID del cliente a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    c = Customer.find_by(id: id)
    return not_found!("customer #{id}") unless c

    as_actor(tenant) do
      name = c.name
      if c.destroy
        json({ deleted: true, id: id, name: name })
      else
        text("Error: #{c.errors.full_messages.join(', ')}")
      end
    end
  end
end

# frozen_string_literal: true

class ContactsDeleteTool < ApplicationTool
  tool_name "contacts_delete"
  description "Elimina un contacto por ID. Devuelve confirmación."
  input_schema(
    properties: { id: { type: "integer", description: "ID del contacto a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    ct = Contact.find_by(id: id)
    return not_found!("contact #{id}") unless ct

    as_actor(tenant) do
      name = ct.name
      if ct.destroy
        json({ deleted: true, id: id, name: name })
      else
        text("Error: #{ct.errors.full_messages.join(', ')}")
      end
    end
  end
end

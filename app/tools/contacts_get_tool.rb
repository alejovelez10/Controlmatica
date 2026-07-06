# frozen_string_literal: true

class ContactsGetTool < ApplicationTool
  tool_name "contacts_get"
  description "Obtiene un contacto por ID."
  input_schema(
    properties: { id: { type: "integer", description: "ID del contacto" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    ct = Contact.find_by(id: id)
    return not_found!("contact #{id}") unless ct

    json(Mcp::Serialize.record(ct, ContactsListTool::KEYS))
  end
end

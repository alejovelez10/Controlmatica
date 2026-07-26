# frozen_string_literal: true

class ProvidersGetTool < ApplicationTool
  tool_name "providers_get"
  description "Obtiene un proveedor por ID, con sus contactos."
  input_schema(
    properties: { id: { type: "integer", description: "ID del proveedor" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    p = Provider.find_by(id: id)
    return not_found!("provider #{id}") unless p

    contacts = p.contacts.map { |ct| { id: ct.id, name: ct.name, email: ct.email, phone: ct.phone, position: ct.position } }
    json(Mcp::Serialize.record(p, ProvidersListTool::KEYS, contacts: contacts))
  end
end

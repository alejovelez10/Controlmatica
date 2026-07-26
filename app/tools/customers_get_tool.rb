# frozen_string_literal: true

class CustomersGetTool < ApplicationTool
  tool_name "customers_get"
  description "Obtiene un cliente por ID, con sus contactos y conteo de proyectos/reportes."
  input_schema(
    properties: { id: { type: "integer", description: "ID del cliente" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    c = Customer.find_by(id: id)
    return not_found!("customer #{id}") unless c

    contacts = c.contacts.map { |ct| { id: ct.id, name: ct.name, email: ct.email, phone: ct.phone, position: ct.position } }
    json(Mcp::Serialize.record(c, CustomersListTool::KEYS, contacts: contacts, contacts_count: contacts.size))
  end
end

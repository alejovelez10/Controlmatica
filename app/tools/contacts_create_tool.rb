# frozen_string_literal: true

class ContactsCreateTool < ApplicationTool
  tool_name "contacts_create"
  description "Crea un contacto. Requiere name. Asócialo a un cliente (customer_id) y/o proveedor (provider_id)."
  input_schema(
    properties: {
      name:        { type: "string",  description: "Nombre del contacto (requerido)" },
      email:       { type: "string",  description: "Email (opcional)" },
      phone:       { type: "string",  description: "Teléfono (opcional)" },
      position:    { type: "string",  description: "Cargo (opcional)" },
      customer_id: { type: "integer", description: "ID del cliente (opcional)" },
      provider_id: { type: "integer", description: "ID del proveedor (opcional)" }
    },
    required: ["name"]
  )

  WRITABLE = %i[name email phone position customer_id provider_id].freeze

  def self.call(name:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    as_actor(tenant) do |actor|
      ct = Contact.new(args.slice(*WRITABLE).merge(name: name))
      ct.user_id = actor&.id if ct.respond_to?(:user_id=)
      if ct.save
        json(Mcp::Serialize.record(ct, ContactsListTool::KEYS))
      else
        text("Error: #{ct.errors.full_messages.join(', ')}")
      end
    end
  end
end

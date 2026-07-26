# frozen_string_literal: true

class ContactsUpdateTool < ApplicationTool
  tool_name "contacts_update"
  description "Actualiza un contacto por ID. Solo modifica los campos enviados."
  input_schema(
    properties: {
      id:          { type: "integer", description: "ID del contacto (requerido)" },
      name:        { type: "string",  description: "Nombre" },
      email:       { type: "string",  description: "Email" },
      phone:       { type: "string",  description: "Teléfono" },
      position:    { type: "string",  description: "Cargo" },
      customer_id: { type: "integer", description: "ID del cliente" },
      provider_id: { type: "integer", description: "ID del proveedor" }
    },
    required: ["id"]
  )

  WRITABLE = %i[name email phone position customer_id provider_id].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    ct = Contact.find_by(id: id)
    return not_found!("contact #{id}") unless ct

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(ct, ContactsListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if ct.update(attrs)
        json(Mcp::Serialize.record(ct, ContactsListTool::KEYS))
      else
        text("Error: #{ct.errors.full_messages.join(', ')}")
      end
    end
  end
end

# frozen_string_literal: true

class CustomersUpdateTool < ApplicationTool
  tool_name "customers_update"
  description "Actualiza un cliente por ID. Solo modifica los campos enviados."
  input_schema(
    properties: {
      id:      { type: "integer", description: "ID del cliente (requerido)" },
      name:    { type: "string",  description: "Nombre / razón social" },
      client:  { type: "string",  description: "Nombre comercial" },
      code:    { type: "string",  description: "Código" },
      nit:     { type: "string",  description: "NIT" },
      phone:   { type: "string",  description: "Teléfono" },
      email:   { type: "string",  description: "Email" },
      web:     { type: "string",  description: "Sitio web" },
      address: { type: "string",  description: "Dirección" }
    },
    required: ["id"]
  )

  WRITABLE = %i[name client code nit phone email web address].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    c = Customer.find_by(id: id)
    return not_found!("customer #{id}") unless c

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(c, CustomersListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if c.update(attrs)
        json(Mcp::Serialize.record(c, CustomersListTool::KEYS))
      else
        text("Error: #{c.errors.full_messages.join(', ')}")
      end
    end
  end
end

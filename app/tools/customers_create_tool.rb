# frozen_string_literal: true

class CustomersCreateTool < ApplicationTool
  tool_name "customers_create"
  description "Crea un cliente. Requiere name. Devuelve el cliente creado o errores de validación."
  input_schema(
    properties: {
      name:    { type: "string", description: "Nombre / razón social (requerido)" },
      client:  { type: "string", description: "Nombre comercial (opcional)" },
      code:    { type: "string", description: "Código del cliente (opcional)" },
      nit:     { type: "string", description: "NIT (opcional)" },
      phone:   { type: "string", description: "Teléfono (opcional)" },
      email:   { type: "string", description: "Email (opcional)" },
      web:     { type: "string", description: "Sitio web (opcional)" },
      address: { type: "string", description: "Dirección (opcional)" }
    },
    required: ["name"]
  )

  WRITABLE = %i[name client code nit phone email web address].freeze

  def self.call(name:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    as_actor(tenant) do |actor|
      attrs = args.slice(*WRITABLE).merge(name: name)
      # code es único (validate_code); autogenerar uno si no se envía.
      attrs[:code] = "MCP-#{SecureRandom.hex(5).upcase}" if attrs[:code].blank?
      c = Customer.new(attrs)
      c.user_id = actor&.id if c.respond_to?(:user_id=)
      if c.save
        json(Mcp::Serialize.record(c, CustomersListTool::KEYS))
      else
        text("Error: #{c.errors.full_messages.join(', ')}")
      end
    end
  end
end

# frozen_string_literal: true

class ProvidersCreateTool < ApplicationTool
  tool_name "providers_create"
  description "Crea un proveedor. Requiere name. Devuelve el proveedor creado o errores."
  input_schema(
    properties: {
      name:    { type: "string", description: "Nombre / razón social (requerido)" },
      nit:     { type: "string", description: "NIT (opcional)" },
      phone:   { type: "string", description: "Teléfono (opcional)" },
      email:   { type: "string", description: "Email (opcional)" },
      web:     { type: "string", description: "Sitio web (opcional)" },
      address: { type: "string", description: "Dirección (opcional)" }
    },
    required: ["name"]
  )

  WRITABLE = %i[name nit phone email web address].freeze

  def self.call(name:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    as_actor(tenant) do |actor|
      p = Provider.new(args.slice(*WRITABLE).merge(name: name))
      p.user_id = actor&.id if p.respond_to?(:user_id=)
      if p.save
        json(Mcp::Serialize.record(p, ProvidersListTool::KEYS))
      else
        text("Error: #{p.errors.full_messages.join(', ')}")
      end
    end
  end
end

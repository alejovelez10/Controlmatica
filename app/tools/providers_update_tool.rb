# frozen_string_literal: true

class ProvidersUpdateTool < ApplicationTool
  tool_name "providers_update"
  description "Actualiza un proveedor por ID. Solo modifica los campos enviados."
  input_schema(
    properties: {
      id:      { type: "integer", description: "ID del proveedor (requerido)" },
      name:    { type: "string",  description: "Nombre / razón social" },
      nit:     { type: "string",  description: "NIT" },
      phone:   { type: "string",  description: "Teléfono" },
      email:   { type: "string",  description: "Email" },
      web:     { type: "string",  description: "Sitio web" },
      address: { type: "string",  description: "Dirección" }
    },
    required: ["id"]
  )

  WRITABLE = %i[name nit phone email web address].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    p = Provider.find_by(id: id)
    return not_found!("provider #{id}") unless p

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(p, ProvidersListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if p.update(attrs)
        json(Mcp::Serialize.record(p, ProvidersListTool::KEYS))
      else
        text("Error: #{p.errors.full_messages.join(', ')}")
      end
    end
  end
end

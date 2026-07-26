# frozen_string_literal: true

class ProvidersDeleteTool < ApplicationTool
  tool_name "providers_delete"
  description "Elimina un proveedor por ID (y sus contactos dependientes). Devuelve confirmación."
  input_schema(
    properties: { id: { type: "integer", description: "ID del proveedor a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    p = Provider.find_by(id: id)
    return not_found!("provider #{id}") unless p

    as_actor(tenant) do
      name = p.name
      if p.destroy
        json({ deleted: true, id: id, name: name })
      else
        text("Error: #{p.errors.full_messages.join(', ')}")
      end
    end
  end
end

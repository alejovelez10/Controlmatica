# frozen_string_literal: true

class UsersGetTool < ApplicationTool
  tool_name "users_get"
  description "Obtiene un usuario por ID (sin credenciales), con su rol."
  input_schema(
    properties: { id: { type: "integer", description: "ID del usuario" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    u = User.find_by(id: id)
    return not_found!("user #{id}") unless u

    json(Mcp::Serialize.record(u, UsersListTool::KEYS, rol_name: u.rol&.name))
  end
end

# frozen_string_literal: true

class RolsListTool < ApplicationTool
  tool_name "rols_list"
  description "Lista los roles del sistema (id, nombre, descripción)."
  input_schema(properties: {}, required: [])

  KEYS = %i[id name description created_at].freeze

  def self.call(server_context:, **_ignored)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    json(Mcp::Serialize.collection(Rol.order(:name), KEYS))
  end
end

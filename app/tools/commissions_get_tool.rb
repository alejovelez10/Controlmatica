# frozen_string_literal: true

class CommissionsGetTool < ApplicationTool
  tool_name "commissions_get"
  description "Obtiene una comisión por ID."
  input_schema(
    properties: { id: { type: "integer", description: "ID de la comisión" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    c = Commission.find_by(id: id)
    return not_found!("commission #{id}") unless c

    json(Mcp::Serialize.record(c, CommissionsListTool::KEYS))
  end
end

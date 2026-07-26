# frozen_string_literal: true

class ContractorsGetTool < ApplicationTool
  tool_name "contractors_get"
  description "Obtiene un registro de contratista/tablerista por ID."
  input_schema(
    properties: { id: { type: "integer", description: "ID del registro de contratista" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    c = Contractor.find_by(id: id)
    return not_found!("contractor #{id}") unless c

    json(Mcp::Serialize.record(c, ContractorsListTool::KEYS))
  end
end

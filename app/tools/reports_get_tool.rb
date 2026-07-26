# frozen_string_literal: true

class ReportsGetTool < ApplicationTool
  tool_name "reports_get"
  description "Obtiene un reporte de servicio por ID."
  input_schema(
    properties: { id: { type: "integer", description: "ID del reporte" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    r = Report.find_by(id: id)
    return not_found!("report #{id}") unless r

    json(Mcp::Serialize.record(r, ReportsListTool::KEYS))
  end
end

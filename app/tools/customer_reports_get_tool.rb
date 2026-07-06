# frozen_string_literal: true

class CustomerReportsGetTool < ApplicationTool
  tool_name "customer_reports_get"
  description "Obtiene un informe de cliente por ID, con los IDs de reportes de servicio incluidos."
  input_schema(
    properties: { id: { type: "integer", description: "ID del informe de cliente" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    cr = CustomerReport.find_by(id: id)
    return not_found!("customer_report #{id}") unless cr

    json(Mcp::Serialize.record(cr, CustomerReportsListTool::KEYS, report_ids: cr.reports.pluck(:id)))
  end
end

# frozen_string_literal: true

class ReportsListTool < ApplicationTool
  tool_name "reports_list"
  description "Lista reportes de servicio. Filtros opcionales: cost_center_id, customer_id, " \
              "report_execute_id, q (descripción de trabajo). Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      cost_center_id:    { type: "integer", description: "Filtra por centro de costo" },
      customer_id:       { type: "integer", description: "Filtra por cliente" },
      report_execute_id: { type: "integer", description: "Filtra por usuario que ejecuta" },
      q:                 { type: "string",  description: "Texto en la descripción del trabajo" },
      limit:             { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id code_report report_date cost_center_id customer_id contact_id report_execute_id
            working_time working_value viatic_value displacement_hours total_value
            work_description viatic_description created_at].freeze

  def self.call(server_context:, cost_center_id: nil, customer_id: nil, report_execute_id: nil, q: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = Report.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    scope = scope.where(customer_id: customer_id) if customer_id
    scope = scope.where(report_execute_id: report_execute_id) if report_execute_id
    scope = scope.where("LOWER(work_description) LIKE ?", "%#{q.downcase}%") if q.present?
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end

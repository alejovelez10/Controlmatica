# frozen_string_literal: true

class CustomerReportsListTool < ApplicationTool
  tool_name "customer_reports_list"
  description "Lista informes de cliente (los que se envían a aprobación). Filtros opcionales: " \
              "cost_center_id, customer_id, report_state. Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "Filtra por centro de costo" },
      customer_id:    { type: "integer", description: "Filtra por cliente" },
      report_state:   { type: "string",  description: "Estado del informe" },
      limit:          { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id report_code token report_state report_date customer_id cost_center_id contact_id
            description email approve_date created_at].freeze

  def self.call(server_context:, cost_center_id: nil, customer_id: nil, report_state: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = CustomerReport.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    scope = scope.where(customer_id: customer_id) if customer_id
    scope = scope.where(report_state: report_state) if report_state.present?
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end

# frozen_string_literal: true

# Lista centros de costo (proyectos/servicios) con filtros opcionales.
class CostCentersListTool < ApplicationTool
  tool_name "cost_centers_list"
  description "Lista centros de costo (proyectos/servicios) con filtros opcionales: " \
              "descripción, cliente, estado de ejecución, estado de facturación, tipo de servicio, " \
              "rango de fechas de inicio y número de cotización. Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      description:      { type: "string",  description: "Texto a buscar en la descripción" },
      customer_id:      { type: "integer", description: "ID del cliente" },
      execution_state:  { type: "string",  description: "Estado de ejecución (ej. EN EJECUCION, FINALIZADO)" },
      invoiced_state:   { type: "string",  description: "Estado de facturación" },
      service_type:     { type: "string",  description: "Tipo (PROYECTO / SERVICIO)" },
      date_from:        { type: "string",  description: "Fecha de inicio desde (YYYY-MM-DD)" },
      date_to:          { type: "string",  description: "Fecha de inicio hasta (YYYY-MM-DD)" },
      quotation_number: { type: "string",  description: "Número de cotización" },
      limit:            { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  def self.call(server_context:, description: nil, customer_id: nil, execution_state: nil,
                invoiced_state: nil, service_type: nil, date_from: nil, date_to: nil,
                quotation_number: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = CostCenter.search(description, customer_id, execution_state, invoiced_state,
                              nil, service_type, date_from, date_to, quotation_number)
    records = scope.includes(:customer).order(created_at: :desc).limit(limit)

    json(records.map { |cc| Mcp::CostCenterSerializer.summary(cc) })
  end
end

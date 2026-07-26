# frozen_string_literal: true

class SalesOrdersListTool < ApplicationTool
  tool_name "sales_orders_list"
  description "Lista órdenes de compra/venta. Filtros opcionales: cost_center_id, state, q (número/descripción). " \
              "Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "Filtra por centro de costo" },
      state:          { type: "string",  description: "Estado de la orden" },
      q:              { type: "string",  description: "Texto en número de orden o descripción" },
      limit:          { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id cost_center_id order_number order_value created_date state description sum_invoices created_at].freeze

  def self.call(server_context:, cost_center_id: nil, state: nil, q: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = SalesOrder.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    scope = scope.where(state: state) if state.present?
    scope = scope.where("LOWER(order_number) LIKE :t OR LOWER(description) LIKE :t", t: "%#{q.downcase}%") if q.present?
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end

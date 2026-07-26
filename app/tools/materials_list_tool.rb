# frozen_string_literal: true

class MaterialsListTool < ApplicationTool
  tool_name "materials_list"
  description "Lista materiales/compras. Filtros opcionales: cost_center_id, provider_id, q (descripción), " \
              "sales_state. Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "Filtra por centro de costo" },
      provider_id:    { type: "integer", description: "Filtra por proveedor" },
      q:              { type: "string",  description: "Texto en la descripción" },
      sales_state:    { type: "string",  description: "Estado de compra" },
      limit:          { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id cost_center_id provider_id sales_number sales_date amount delivery_date
            sales_state description provider_invoice_number provider_invoice_value created_at].freeze

  def self.call(server_context:, cost_center_id: nil, provider_id: nil, q: nil, sales_state: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = Material.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    scope = scope.where(provider_id: provider_id) if provider_id
    scope = scope.where(sales_state: sales_state) if sales_state.present?
    scope = scope.where("LOWER(description) LIKE ?", "%#{q.downcase}%") if q.present?
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end

# frozen_string_literal: true

class QuotationsListTool < ApplicationTool
  tool_name "quotations_list"
  description "Lista cotizaciones. Filtro opcional cost_center_id. Devuelve hasta `limit` resultados. " \
              "(Las cotizaciones se gestionan desde el centro de costo; esta tool es de solo lectura.)"
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "Filtra por centro de costo" },
      limit:          { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id cost_center_id quotation_number description quotation_value eng_hours
            hour_real hour_cotizada materials_value viatic_value created_at].freeze

  def self.call(server_context:, cost_center_id: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = Quotation.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end

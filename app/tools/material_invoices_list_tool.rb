# frozen_string_literal: true

class MaterialInvoicesListTool < ApplicationTool
  tool_name "material_invoices_list"
  description "Lista facturas de proveedor asociadas a materiales. Filtro opcional material_id. " \
              "Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      material_id: { type: "integer", description: "Filtra por material" },
      limit:       { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id material_id number value observation created_at].freeze

  def self.call(server_context:, material_id: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = MaterialInvoice.all
    scope = scope.where(material_id: material_id) if material_id
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end

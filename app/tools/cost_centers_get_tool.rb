# frozen_string_literal: true

# Obtiene un centro de costo por id, con métricas y conteos de sus relaciones.
class CostCentersGetTool < ApplicationTool
  tool_name "cost_centers_get"
  description "Obtiene el detalle de un centro de costo por su ID, incluyendo métricas " \
              "(horas, valores) y conteos de reportes, materiales, contratistas, órdenes y facturas."
  input_schema(
    properties: { id: { type: "integer", description: "ID del centro de costo" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    cc = CostCenter.find_by(id: id)
    return not_found!("cost_center #{id}") unless cc

    json(Mcp::CostCenterSerializer.full(cc))
  end
end

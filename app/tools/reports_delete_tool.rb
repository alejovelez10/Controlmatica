# frozen_string_literal: true

class ReportsDeleteTool < ApplicationTool
  tool_name "reports_delete"
  description "Elimina un reporte de servicio por ID. Recalcula totales del centro de costo. Devuelve confirmación."
  input_schema(
    properties: { id: { type: "integer", description: "ID del reporte a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    r = Report.find_by(id: id)
    return not_found!("report #{id}") unless r

    as_actor(tenant) do
      cc_id = r.cost_center_id
      code = r.code_report
      r.destroy
      json({ deleted: true, id: id, code_report: code, cost_center_id: cc_id })
    end
  end
end

# frozen_string_literal: true

class CustomerReportsDeleteTool < ApplicationTool
  tool_name "customer_reports_delete"
  description "Elimina un informe de cliente por ID. Devuelve confirmación."
  input_schema(
    properties: { id: { type: "integer", description: "ID del informe a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    cr = CustomerReport.find_by(id: id)
    return not_found!("customer_report #{id}") unless cr

    as_actor(tenant) do
      code = cr.report_code
      cr.destroy
      json({ deleted: true, id: id, report_code: code })
    end
  end
end

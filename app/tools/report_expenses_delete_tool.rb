# frozen_string_literal: true

class ReportExpensesDeleteTool < ApplicationTool
  tool_name "report_expenses_delete"
  description "Elimina un gasto/legalización por ID. Devuelve confirmación."
  input_schema(
    properties: { id: { type: "integer", description: "ID del gasto a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    re = ReportExpense.find_by(id: id)
    return not_found!("report_expense #{id}") unless re

    as_actor(tenant) do
      cc_id = re.cost_center_id
      re.destroy
      json({ deleted: true, id: id, cost_center_id: cc_id })
    end
  end
end

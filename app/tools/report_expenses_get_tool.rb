# frozen_string_literal: true

class ReportExpensesGetTool < ApplicationTool
  tool_name "report_expenses_get"
  description "Obtiene un gasto/legalización por ID."
  input_schema(
    properties: { id: { type: "integer", description: "ID del gasto" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    re = ReportExpense.find_by(id: id)
    return not_found!("report_expense #{id}") unless re

    json(Mcp::Serialize.record(re, ReportExpensesListTool::KEYS))
  end
end

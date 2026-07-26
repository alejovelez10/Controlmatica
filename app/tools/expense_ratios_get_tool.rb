# frozen_string_literal: true

class ExpenseRatiosGetTool < ApplicationTool
  tool_name "expense_ratios_get"
  description "Obtiene una relación de gastos / anticipo por ID."
  input_schema(
    properties: { id: { type: "integer", description: "ID de la relación de gastos" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    er = ExpenseRatio.find_by(id: id)
    return not_found!("expense_ratio #{id}") unless er

    json(Mcp::Serialize.record(er, ExpenseRatiosListTool::KEYS))
  end
end

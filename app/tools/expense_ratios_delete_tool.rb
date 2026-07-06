# frozen_string_literal: true

class ExpenseRatiosDeleteTool < ApplicationTool
  tool_name "expense_ratios_delete"
  description "Elimina una relación de gastos / anticipo por ID. Devuelve confirmación."
  input_schema(
    properties: { id: { type: "integer", description: "ID de la relación a eliminar" } },
    required: ["id"]
  )

  def self.call(id:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    er = ExpenseRatio.find_by(id: id)
    return not_found!("expense_ratio #{id}") unless er

    as_actor(tenant) do
      er.destroy
      json({ deleted: true, id: id })
    end
  end
end

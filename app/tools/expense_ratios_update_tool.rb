# frozen_string_literal: true

class ExpenseRatiosUpdateTool < ApplicationTool
  tool_name "expense_ratios_update"
  description "Actualiza una relación de gastos / anticipo por ID. Solo modifica los campos enviados."
  input_schema(
    properties: {
      id:           { type: "integer", description: "ID de la relación (requerido)" },
      area:         { type: "string",  description: "Área" },
      start_date:   { type: "string",  description: "Fecha inicio YYYY-MM-DD" },
      end_date:     { type: "string",  description: "Fecha fin YYYY-MM-DD" },
      observations: { type: "string",  description: "Observaciones" },
      anticipo:     { type: "number",  description: "Valor del anticipo" }
    },
    required: ["id"]
  )

  WRITABLE = %i[area start_date end_date observations anticipo].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    er = ExpenseRatio.find_by(id: id)
    return not_found!("expense_ratio #{id}") unless er

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(er, ExpenseRatiosListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if er.update(attrs)
        json(Mcp::Serialize.record(er, ExpenseRatiosListTool::KEYS))
      else
        text("Error: #{er.errors.full_messages.join(', ')}")
      end
    end
  end
end

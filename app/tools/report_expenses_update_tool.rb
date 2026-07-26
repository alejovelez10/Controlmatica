# frozen_string_literal: true

class ReportExpensesUpdateTool < ApplicationTool
  tool_name "report_expenses_update"
  description "Actualiza un gasto/legalización por ID. Solo modifica los campos enviados."
  input_schema(
    properties: {
      id:             { type: "integer", description: "ID del gasto (requerido)" },
      invoice_name:   { type: "string",  description: "Nombre/proveedor" },
      invoice_number: { type: "string",  description: "Número de factura" },
      invoice_type:   { type: "string",  description: "Tipo de factura" },
      invoice_date:   { type: "string",  description: "Fecha YYYY-MM-DD" },
      invoice_value:  { type: "number",  description: "Valor base" },
      invoice_tax:    { type: "number",  description: "IVA" },
      invoice_total:  { type: "number",  description: "Total" },
      identification: { type: "string",  description: "NIT/identificación" },
      description:    { type: "string",  description: "Descripción" }
    },
    required: ["id"]
  )

  WRITABLE = %i[invoice_name invoice_number invoice_type invoice_date invoice_value
                invoice_tax invoice_total identification description].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    re = ReportExpense.find_by(id: id)
    return not_found!("report_expense #{id}") unless re

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(re, ReportExpensesListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if re.update(attrs)
        json(Mcp::Serialize.record(re, ReportExpensesListTool::KEYS))
      else
        text("Error: #{re.errors.full_messages.join(', ')}")
      end
    end
  end
end

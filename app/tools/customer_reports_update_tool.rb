# frozen_string_literal: true

class CustomerReportsUpdateTool < ApplicationTool
  tool_name "customer_reports_update"
  description "Actualiza un informe de cliente por ID. Solo modifica los campos enviados."
  input_schema(
    properties: {
      id:           { type: "integer", description: "ID del informe (requerido)" },
      report_date:  { type: "string",  description: "Fecha del informe YYYY-MM-DD" },
      description:  { type: "string",  description: "Descripción" },
      email:        { type: "string",  description: "Email de envío" },
      report_state: { type: "string",  description: "Estado del informe" },
      contact_id:   { type: "integer", description: "ID del contacto" }
    },
    required: ["id"]
  )

  WRITABLE = %i[report_date description email report_state contact_id].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    cr = CustomerReport.find_by(id: id)
    return not_found!("customer_report #{id}") unless cr

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(cr, CustomerReportsListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if cr.update(attrs)
        json(Mcp::Serialize.record(cr, CustomerReportsListTool::KEYS))
      else
        text("Error: #{cr.errors.full_messages.join(', ')}")
      end
    end
  end
end

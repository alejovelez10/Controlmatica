# frozen_string_literal: true

class ReportsUpdateTool < ApplicationTool
  tool_name "reports_update"
  description "Actualiza un reporte de servicio por ID. Solo modifica los campos enviados."
  input_schema(
    properties: {
      id:                 { type: "integer", description: "ID del reporte (requerido)" },
      report_date:        { type: "string",  description: "Fecha del reporte YYYY-MM-DD" },
      working_time:       { type: "number",  description: "Horas trabajadas" },
      displacement_hours: { type: "number",  description: "Horas de desplazamiento" },
      viatic_value:       { type: "number",  description: "Valor viáticos" },
      work_description:   { type: "string",  description: "Descripción del trabajo" },
      viatic_description: { type: "string",  description: "Descripción de viáticos" },
      contact_id:         { type: "integer", description: "ID del contacto" }
    },
    required: ["id"]
  )

  WRITABLE = %i[report_date working_time displacement_hours viatic_value
                work_description viatic_description contact_id].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    r = Report.find_by(id: id)
    return not_found!("report #{id}") unless r

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(r, ReportsListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if r.update(attrs)
        json(Mcp::Serialize.record(r, ReportsListTool::KEYS))
      else
        text("Error: #{r.errors.full_messages.join(', ')}")
      end
    end
  end
end

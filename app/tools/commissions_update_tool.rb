# frozen_string_literal: true

class CommissionsUpdateTool < ApplicationTool
  tool_name "commissions_update"
  description "Actualiza una comisión por ID. Solo modifica los campos enviados. Recalcula el total."
  input_schema(
    properties: {
      id:           { type: "integer", description: "ID de la comisión (requerido)" },
      value_hour:   { type: "number",  description: "Valor hora" },
      hours_worked: { type: "number",  description: "Horas trabajadas" },
      start_date:   { type: "string",  description: "Fecha inicio YYYY-MM-DD" },
      end_date:     { type: "string",  description: "Fecha fin YYYY-MM-DD" },
      observation:  { type: "string",  description: "Observación" }
    },
    required: ["id"]
  )

  WRITABLE = %i[value_hour hours_worked start_date end_date observation].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    c = Commission.find_by(id: id)
    return not_found!("commission #{id}") unless c

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(c, CommissionsListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if c.update(attrs)
        json(Mcp::Serialize.record(c, CommissionsListTool::KEYS))
      else
        text("Error: #{c.errors.full_messages.join(', ')}")
      end
    end
  end
end

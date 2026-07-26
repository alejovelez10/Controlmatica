# frozen_string_literal: true

class ContractorsUpdateTool < ApplicationTool
  tool_name "contractors_update"
  description "Actualiza un registro de contratista/tablerista por ID. Solo modifica los campos enviados. " \
              "El valor (ammount) se recalcula como horas × valor hora del centro."
  input_schema(
    properties: {
      id:              { type: "integer", description: "ID del registro (requerido)" },
      user_execute_id: { type: "integer", description: "ID del usuario que ejecuta las horas" },
      hours:           { type: "number",  description: "Horas trabajadas" },
      sales_number:    { type: "string",  description: "Número/consecutivo" },
      sales_date:      { type: "string",  description: "Fecha YYYY-MM-DD" },
      description:     { type: "string",  description: "Descripción" }
    },
    required: ["id"]
  )

  WRITABLE = %i[user_execute_id hours sales_number sales_date description].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    c = Contractor.find_by(id: id)
    return not_found!("contractor #{id}") unless c

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(c, ContractorsListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do |actor|
      c.update_user = actor&.id if c.respond_to?(:update_user=)
      if c.update(attrs)
        json(Mcp::Serialize.record(c, ContractorsListTool::KEYS))
      else
        text("Error: #{c.errors.full_messages.join(', ')}")
      end
    end
  end
end

# frozen_string_literal: true

class ParameterizationsUpdateTool < ApplicationTool
  tool_name "parameterizations_update"
  description "Actualiza el valor de un parámetro de configuración por ID (number_value y/o money_value)."
  input_schema(
    properties: {
      id:           { type: "integer", description: "ID del parámetro (requerido)" },
      number_value: { type: "integer", description: "Valor numérico" },
      money_value:  { type: "integer", description: "Valor monetario" }
    },
    required: ["id"]
  )

  WRITABLE = %i[number_value money_value].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    p = Parameterization.find_by(id: id)
    return not_found!("parameterization #{id}") unless p

    attrs = args.slice(*WRITABLE)
    return json(Mcp::Serialize.record(p, ParameterizationsListTool::KEYS)) if attrs.empty?

    as_actor(tenant) do
      if p.update(attrs)
        json(Mcp::Serialize.record(p, ParameterizationsListTool::KEYS))
      else
        text("Error: #{p.errors.full_messages.join(', ')}")
      end
    end
  end
end

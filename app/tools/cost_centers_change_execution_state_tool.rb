# frozen_string_literal: true

# Acción de dominio: cambia el estado de ejecución de un centro de costo.
class CostCentersChangeExecutionStateTool < ApplicationTool
  tool_name "cost_centers_change_execution_state"
  description "Cambia el estado de ejecución de un centro de costo (ej. 'EN EJECUCION', 'FINALIZADO'). " \
              "Devuelve el registro actualizado."
  input_schema(
    properties: {
      id:              { type: "integer", description: "ID del centro de costo" },
      execution_state: { type: "string",  description: "Nuevo estado de ejecución" }
    },
    required: %w[id execution_state]
  )

  def self.call(id:, execution_state:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    cc = CostCenter.find_by(id: id)
    return not_found!("cost_center #{id}") unless cc

    as_actor(tenant) do
      if cc.update(execution_state: execution_state)
        json(Mcp::CostCenterSerializer.summary(cc))
      else
        text("Error: #{cc.errors.full_messages.join(', ')}")
      end
    end
  end
end

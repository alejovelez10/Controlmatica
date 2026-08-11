# frozen_string_literal: true

# Envoltorio de ExpenseBudgetService.available_for. Este paquete NO reimplementa
# la aritmética presupuestal: hay una sola fuente de verdad (§2.6) y vive en el
# servicio del paquete 04.
class ExpenseBudgetsAvailableTool < ApplicationTool
  tool_name "expense_budgets_available"
  description "Presupuesto disponible de una persona en un centro de costo: asignado, gastado y " \
              "disponible, en COP. Consúltala ANTES de registrar un gasto para poder advertir a la " \
              "persona. Si se omite user_id se usa la persona del actor (X-Actor-Phone / X-Actor-Email). " \
              "Usa el campo `message` tal cual: ya viene formateado en pesos."
  input_schema(
    properties: {
      cost_center_id:     { type: "integer", description: "ID del centro de costo (requerido)" },
      user_id:            { type: "integer", description: "ID de la persona (opcional; por defecto el actor)" },
      exclude_expense_id: { type: "integer", description: "ID de gasto a excluir del gastado (al editar)" }
    },
    required: %w[cost_center_id]
  )

  def self.call(cost_center_id:, server_context:, user_id: nil, exclude_expense_id: nil)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    centro = CostCenter.find_by(id: cost_center_id)
    return not_found!("cost_center #{cost_center_id}") unless centro

    # ESTRICTO TAMBIÉN AQUÍ: devolverle el presupuesto del Administrador a quien
    # no se identificó es una fuga de información y, además, un número que
    # induce al agente a decirle a la persona que tiene plata que no tiene.
    resolved_user_id = user_id || actor_user_strict(server_context)&.id
    return text(NO_ACTOR_MESSAGE) unless resolved_user_id

    persona = User.find_by(id: resolved_user_id)
    return not_found!("user #{resolved_user_id}") unless persona

    datos = ExpenseBudgetService.available_for(cost_center_id: centro.id, user_id: persona.id,
                                               exclude_expense_id: exclude_expense_id)

    json(cost_center_id: centro.id, cost_center_code: centro.code,
         user_id: persona.id, user_name: [persona.names, persona.last_names].compact.join(" ").strip,
         has_budget: datos[:has_budget], currency: Currency::DEFAULT,
         # to_s("F") y no to_s: BigDecimal#to_s da "0.5e6" y el agente le lee
         # 0,5 pesos a medio millón.
         assigned: datos[:assigned].to_d.to_s("F"), spent: datos[:spent].to_d.to_s("F"),
         available: datos[:available].to_d.to_s("F"),
         message: mensaje(datos))
  end

  # Texto en español ya formateado, para que el agente no invente separadores de
  # miles (los modelos ponen comas y puntos al azar en pesos colombianos).
  #
  # Sin partida NO se dice "disponible $0": el agente lo lee como rechazo y le
  # dice a la persona que no puede registrar, cuando sí puede.
  def self.mensaje(datos)
    unless datos[:has_budget]
      return "Esta persona no tiene presupuesto asignado en este centro de costo."
    end

    "Disponible #{ExpenseBudgetService.money(datos[:available])} de " \
      "#{ExpenseBudgetService.money(datos[:assigned])} asignados."
  end
  private_class_method :mensaje
end

# frozen_string_literal: true

# Reglas de gasto aplicables a una persona, con los límites ya resueltos.
#
# Es la Tarea 7 del paquete 14, cuyo archivo pertenece a este paquete (§7.2). Se
# nombra `expense_rules_list` y no `expense_rules_for_user` para que se auto-
# exponga por el sufijo `_list` y ALWAYS_EXPOSED siga teniendo exactamente los 6
# nombres que no terminan en _list / _get / _create.
#
# Para qué sirve: el agente necesita los límites ANTES de conversar, no después
# de que la persona ya contó el gasto. Con esto puede decir "recuerda que no se
# aceptan comprobantes de más de 30 días" en vez de rechazar al final.
class ExpenseRulesListTool < ApplicationTool
  tool_name "expense_rules_list"
  description "Reglas de gasto aplicables a una persona, con los límites deterministas ya " \
              "resueltos (antigüedad máxima del comprobante, tope de valor, validación de " \
              "duplicados) y las instrucciones en texto libre que escribió el administrador. " \
              "Si se omite user_id se usa la persona del actor (X-Actor-Phone / X-Actor-Email). " \
              "Las instrucciones de texto las aplica el agente: el servidor NO las evalúa."
  input_schema(
    properties: {
      user_id: { type: "integer", description: "ID de la persona (opcional; por defecto el actor)" }
    },
    required: []
  )

  KEYS = %i[id name active is_default max_invoice_age_days max_invoice_value check_duplicates
            agent_instructions].freeze

  def self.call(server_context:, user_id: nil)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    resolved_user_id = user_id || actor_user_strict(server_context)&.id
    return text(NO_ACTOR_MESSAGE) unless resolved_user_id

    persona = User.find_by(id: resolved_user_id)
    return not_found!("user #{resolved_user_id}") unless persona

    reglas = ExpenseRule.aplicables_a(persona).to_a
    limites = ExpenseRuleService.effective_limits(reglas)

    json(user_id: persona.id,
         rules: Mcp::Serialize.collection(reglas, KEYS),
         limits: { max_invoice_age_days: limites[:max_invoice_age_days],
                   # to_s("F") por la misma razón de siempre: BigDecimal#to_s
                   # devuelve notación científica.
                   max_invoice_value: limites[:max_invoice_value]&.to_d&.to_s("F"),
                   check_duplicates: limites[:check_duplicates] },
         agent_instructions: limites[:agent_instructions])
  end
end

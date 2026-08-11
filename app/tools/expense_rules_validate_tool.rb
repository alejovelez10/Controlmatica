# frozen_string_literal: true

# Valida un gasto candidato SIN guardar nada. Es la llamada obligatoria del
# agente antes de crear (§A.2 de la especificación de Taimes).
#
# Este archivo no contiene ni una regla de negocio: la fuente única es
# ExpenseRuleService (paquete 14). Aquí solo se arma el candidato, se traduce el
# veredicto al vocabulario del agente y se le pega el bloque de presupuesto.
class ExpenseRulesValidateTool < ApplicationTool
  tool_name "expense_rules_validate"
  description "Valida un gasto candidato contra las reglas de negocio de Controlmatica " \
              "(antigüedad del comprobante, tope por gasto, duplicados) y, opcionalmente, contra " \
              "el presupuesto disponible. NO guarda nada. Llámala SIEMPRE antes de " \
              "report_expenses_create. Si alguna violación trae blocking: true, no registres el " \
              "gasto sin explicarle el motivo a la persona y obtener su confirmación explícita: " \
              "esa confirmación se envía luego como confirm_rule_violations en report_expenses_create. " \
              "El campo agent_instructions trae las reglas que escribió el administrador en texto " \
              "libre: aplícalas tú, el servidor no las evalúa."
  input_schema(
    properties: {
      cost_center_id:     { type: "integer", description: "ID del centro de costo (requerido)" },
      user_invoice_id:    { type: "integer", description: "Persona responsable (opcional; por defecto el actor)" },
      invoice_name:       { type: "string",  description: "Proveedor" },
      identification:     { type: "string",  description: "NIT/identificación del proveedor" },
      invoice_number:     { type: "string",  description: "Número de factura" },
      invoice_date:       { type: "string",  description: "Fecha de la factura YYYY-MM-DD" },
      invoice_value:      { type: "number",  description: "Valor base en COP" },
      invoice_tax:        { type: "number",  description: "IVA en COP" },
      invoice_total:      { type: "number",  description: "Total en COP" },
      currency:           { type: "string",  description: "Moneda ISO 4217 (COP, USD, EUR)" },
      foreign_value:      { type: "number",  description: "Valor base en la moneda del comprobante" },
      foreign_tax:        { type: "number",  description: "Impuestos en la moneda del comprobante" },
      foreign_total:      { type: "number",  description: "Total en la moneda del comprobante" },
      exchange_rate:      { type: "number",  description: "Tasa a COP de 1 unidad de currency" },
      description:        { type: "string",  description: "Descripción del gasto" },
      exclude_expense_id: { type: "integer", description: "ID del gasto que se está editando, para no compararlo contra sí mismo" },
      include_budget:     { type: "boolean", description: "Incluir el bloque de presupuesto (default true)" }
    },
    required: %w[cost_center_id]
  )

  CANDIDATE_FIELDS = %i[cost_center_id user_invoice_id invoice_name identification invoice_number
                        invoice_date invoice_value invoice_tax invoice_total currency
                        foreign_value foreign_tax foreign_total exchange_rate description].freeze

  def self.call(cost_center_id:, server_context:, user_invoice_id: nil, exclude_expense_id: nil,
                include_budget: true, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant
    return not_found!("cost_center #{cost_center_id}") unless CostCenter.exists?(cost_center_id)

    # AQUÍ NO SE RECHAZA POR FALTA DE ACTOR: validar sin persona sigue siendo
    # útil (el agente puede estar armando el gasto antes de identificar a nadie);
    # lo único que pasa es que el bloque `budget` viene en null.
    resolved_user_id = user_invoice_id || actor_user_strict(server_context)&.id

    candidato = ReportExpense.new(args.slice(*CANDIDATE_FIELDS)
                                     .merge(cost_center_id: cost_center_id,
                                            user_invoice_id: resolved_user_id))
    candidato.id = nil
    # `valid?` NO guarda: se llama solo para disparar los before_validation de
    # moneda, que son los que dejan invoice_value en pesos cuando el comprobante
    # viene en dólares. Sin esto, un gasto en USD se compararía contra el tope y
    # contra el presupuesto con invoice_value en blanco.
    candidato.valid?

    responsable = resolved_user_id && User.find_by(id: resolved_user_id)
    violations = ExpenseRuleService.validate(candidato, user: responsable)

    lista = violations.value[:violations].map do |v|
      # blocking: true = report_expenses_create la rechaza mientras la persona
      # no confirme. No la inventa esta tool: TODA violación determinista del
      # paquete 14 tiene ese efecto.
      { rule: v[:rule], code: v[:code], message: v[:message], blocking: true }
    end

    presupuesto = nil
    if ActiveModel::Type::Boolean.new.cast(include_budget) != false && resolved_user_id
      datos = ExpenseBudgetService.available_for(cost_center_id: cost_center_id,
                                                 user_id: resolved_user_id,
                                                 exclude_expense_id: exclude_expense_id)
      presupuesto = { has_budget: datos[:has_budget],
                      assigned: datos[:assigned].to_d.to_s("F"),
                      spent: datos[:spent].to_d.to_s("F"),
                      available: datos[:available].to_d.to_s("F") }

      exceso = candidato.invoice_value.to_d - datos[:available]
      if datos[:has_budget] && exceso.positive?
        lista << { rule: "presupuesto", code: "budget_exceeded", blocking: false,
                   message: "Este gasto supera el disponible en #{ExpenseBudgetService.money(exceso)}. " \
                            "Se puede registrar, pero quedará marcado como excedido." }
      end
    end

    bloqueantes = lista.count { |v| v[:blocking] }
    json(ok: bloqueantes.zero?,
         blocking_count: bloqueantes,
         warning_count: lista.size - bloqueantes,
         violations: lista,
         agent_instructions: violations.value[:agent_instructions],
         applied_rules: violations.value[:applied_rules],
         budget: presupuesto)
  end
end

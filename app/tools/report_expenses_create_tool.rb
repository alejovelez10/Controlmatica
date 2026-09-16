# frozen_string_literal: true

class ReportExpensesCreateTool < ApplicationTool
  tool_name "report_expenses_create"
  description "Registra un gasto/legalización en un centro de costo. Requiere cost_center_id. " \
              "El gasto queda SIEMPRE a nombre de la persona identificada por X-Actor-Phone o " \
              "X-Actor-Email; si no se identifica a nadie y no se indica user_invoice_id explícito, " \
              "la tool RECHAZA y no registra nada (nunca lo atribuye al Administrador). " \
              "Antes de llamar a esta tool consulta expense_rules_validate: si devuelve alguna " \
              "violación con blocking: true, el gasto NO se puede registrar de ninguna forma " \
              "—no hay confirmación que lo permita—; explícale el motivo a la persona y pídele " \
              "corregir el comprobante. Las violaciones con blocking: false sí se registran: el " \
              "gasto queda \"sin aprobar\" y la respuesta trae el motivo para que se lo cuentes. " \
              "Los valores (invoice_value/tax/total) van en pesos; si el comprobante está en otra " \
              "moneda usa currency + foreign_* + exchange_rate (pídela con exchange_rates_get). " \
              "Usa report_expense_options_list para obtener type_identification_id y payment_type_id válidos."
  input_schema(
    properties: {
      cost_center_id:         { type: "integer", description: "ID del centro de costo (requerido)" },
      user_invoice_id:        { type: "integer", description: "ID del usuario que reporta el gasto (opcional; por defecto la persona identificada por teléfono o correo)" },
      invoice_name:           { type: "string",  description: "Nombre/proveedor de la factura (opcional)" },
      invoice_number:         { type: "string",  description: "Número de factura (opcional)" },
      invoice_type:           { type: "string",  description: "Tipo de factura (opcional)" },
      invoice_date:           { type: "string",  description: "Fecha de la factura YYYY-MM-DD (opcional)" },
      invoice_value:          { type: "number",  description: "Valor base en COP (opcional)" },
      invoice_tax:            { type: "number",  description: "IVA en COP (opcional)" },
      invoice_total:          { type: "number",  description: "Total en COP (opcional)" },
      identification:         { type: "string",  description: "NIT/identificación (opcional)" },
      description:            { type: "string",  description: "Descripción (opcional)" },
      type_identification_id: { type: "integer", description: "ID de opción de categoría \"Tipo\" (el tipo de gasto). Obtenlo con report_expense_options_list(category: \"Tipo\"). Opcional; un id que no sea de esa categoría se rechaza." },
      payment_type_id:        { type: "integer", description: "ID de opción de categoría \"Medio de pago\". Obtenlo con report_expense_options_list(category: \"Medio de pago\"). Opcional; un id que no sea de esa categoría se rechaza." },
      currency:               { type: "string",  description: "Moneda ISO 4217 del comprobante. Valores validos: #{Currency::CODES.join(', ')}. Default COP." },
      foreign_value:          { type: "number",  description: "Valor base en la moneda del comprobante (solo si currency != COP)" },
      foreign_tax:            { type: "number",  description: "Impuestos en la moneda del comprobante" },
      foreign_total:          { type: "number",  description: "Total en la moneda del comprobante" },
      exchange_rate:          { type: "number",  description: "Tasa a COP: cuantos COP vale 1 unidad de currency. Usa exchange_rates_get para obtenerla." },
      exchange_rate_date:     { type: "string",  description: "Fecha de la tasa aplicada, YYYY-MM-DD. Normalmente = invoice_date." },
      confirm_rule_violations: { type: "boolean", description: "OBSOLETO desde 2026-09-15, se ignora. Cada regla decide si frena (blocking: true, y entonces no hay confirmación posible) o si solo deja el gasto sin aprobar. Se sigue aceptando para no romper conversaciones en curso." }
    },
    required: %w[cost_center_id type_identification_id]
  )

  # NUNCA ESCRIBIBLES desde el argumento (y hay un test por cada uno):
  # budget_status, budget_reason, expense_budget_id, accounting_approved,
  # accounting_approved_by_id, accounting_approved_at, is_acepted, receipt_file,
  # exchange_rate_source, last_user_edited_id y rule_violations. Son campos que
  # escribe el servidor: dejar que el llamador los declare los vuelve inútiles
  # como dato auditable.
  WRITABLE = %i[cost_center_id user_invoice_id invoice_name invoice_number invoice_type invoice_date
                invoice_value invoice_tax invoice_total identification description
                type_identification_id payment_type_id
                currency foreign_value foreign_tax foreign_total
                exchange_rate exchange_rate_date].freeze

  # Cada id de opción tiene UNA categoría válida. Sin esto, `belongs_to
  # optional: true` deja pasar tanto un id inexistente (FK colgando, y el MCP
  # no tiene tool de borrado) como uno de la otra categoría (EFECTIVO guardado
  # como tipo de gasto).
  OPTION_CATEGORIES = {
    type_identification_id: ReportExpenseOptionsListTool::CATEGORY_TIPO,
    payment_type_id:        ReportExpenseOptionsListTool::CATEGORY_MEDIO
  }.freeze

  # Válvula de reversión del rollout: con MCP_STRICT_EXPENSE_ACTOR=false se
  # restaura el comportamiento laxo anterior SIN desplegar código. Por defecto
  # (variable ausente) el modo es estricto.
  STRICT_ENV = "MCP_STRICT_EXPENSE_ACTOR"

  def self.strict_actor?
    ENV[STRICT_ENV].to_s.downcase != "false"
  end

  def self.call(cost_center_id:, server_context:, user_invoice_id: nil,
                confirm_rule_violations: false, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant
    return not_found!("cost_center #{cost_center_id}") unless CostCenter.exists?(cost_center_id)

    actor = actor_user_strict(server_context)
    actor ||= actor_user(tenant, server_context) unless strict_actor?

    # Sin actor identificado y sin user_invoice_id explícito -> se rechaza.
    # NUNCA se cae al Administrador: un gasto atribuido a quien no lo hizo es
    # peor que un gasto no registrado (arquitectura §6.3).
    resolved_user_id = user_invoice_id || actor&.id
    return text(NO_ACTOR_MESSAGE) unless resolved_user_id
    return not_found!("user #{resolved_user_id}") unless User.exists?(resolved_user_id)

    # GUARD DE IDS DE OPCION — existencia Y categoria, antes de ExpenseRuleService
    # y de persist_with_evaluation!, y FUERA del lock del centro de costo (§2.7):
    # rechazar algo que se sabia desde el argumento no debe alargar la seccion
    # critica.
    OPTION_CATEGORIES.each_key do |campo|
      error = option_error(campo, args[campo])
      return text(error) if error
    end

    # El TIPO es obligatorio, y lo exige el SERVIDOR y no el prompt. El body ya
    # lo pedia, pero el modelo se lo saltea de forma no deterministica: el
    # 2026-09-09 en prod llamo a report_expense_options_list, recibio la lista
    # entera y despues guardo sin haberle preguntado nada a la persona. Un gasto
    # sin tipo no lo puede clasificar contabilidad, y el MCP no tiene tool de
    # edicion ni de borrado para arreglarlo despues.
    if args[:type_identification_id].nil? ||
       args[:type_identification_id].to_s.strip.empty?
      return text(
        "Error: falta type_identification_id, que es OBLIGATORIO. NO se registro " \
        "nada. Llama a report_expense_options_list con category: \"Tipo\", " \
        "muestrale a la persona TODAS las opciones que devuelva y usa el id de la " \
        "que ella elija. No elijas tu, y no inventes un id."
      )
    end

    creator = actor || User.find(resolved_user_id)

    previous = User.current
    begin
      User.current = creator
      attrs = args.slice(*WRITABLE).merge(cost_center_id: cost_center_id,
                                          user_invoice_id: resolved_user_id)
      re = ReportExpense.new(attrs)
      # COMPROBANTE OBLIGATORIO: APAGADO EN ESTE CANAL, Y NO POR OLVIDO.
      #
      # La regla del 2026-09-10 exige comprobante en todo gasto nuevo, pero el
      # flujo documentado de WhatsApp (docs/TAIMES-AGENTE-GASTOS.md) es
      # create -> receipt_url_get -> attach_receipt: la URL de subida se pide CON
      # EL ID del gasto, asi que el archivo no existe todavia cuando se crea.
      # Exigirlo aqui no haria el gasto mas completo, haria imposible registrarlo
      # por WhatsApp.
      #
      # Para cerrar tambien este canal hay que cambiar el flujo (que el agente
      # suba primero y mande el `upload_key` al crear), y eso es una decision de
      # producto sobre el contrato con Taimes, no un ajuste de validacion.
      re.omitir_comprobante_obligatorio = true
      re.exchange_rate_source = resolve_rate_source(re)
      re.user_id = creator.id
      # GUARD DE REGLAS DE NEGOCIO — antes de guardar nada (§7.5). El motor es
      # ExpenseRuleService (paquete 14) y es el MISMO que corre en la web: aquí
      # no se escribe ni una regla, solo se decide qué hacer con el veredicto.
      # SOLO FRENAN LAS REGLAS OBLIGATORIAS, Y NO HAY CONFIRMACION QUE LAS PASE
      # (decision de producto, 2026-09-15). Una violación de regla blanda NO
      # entra aquí: se registra, se anota y el gasto queda "sin aprobar" con el
      # motivo, que es lo que la respuesta de éxito ya le cuenta al agente.
      #
      # `confirm_rule_violations` ya no se lee. Se dejó de leer a proposito: el
      # administrador marca la regla como obligatoria para que el gasto no
      # exista, y una confirmación del agente le devolveria la decisión a quien
      # esta reportando.
      veredicto = ExpenseRuleService.validate(re).value
      if veredicto[:blocking_violations].any?
        return json(type: "error",
                    message: veredicto[:blocking_violations].map { |v| v[:message] },
                    # La foto completa, no solo lo que frena: el agente tiene que
                    # poder contarle a la persona todo lo que se incumplio.
                    rule_violations: veredicto[:violations],
                    next_step: "Explícale a la persona por qué no se pudo registrar el gasto. " \
                               "Estas reglas son obligatorias: NO se puede registrar así, ni " \
                               "confirmando. Lo que sí puede hacer es corregir el comprobante " \
                               "(fecha, valor o número de factura) y volver a intentarlo.")
      end

      # PERSISTENCIA — punto de entrada único del paquete 04 (§7.4): toma el
      # lock del centro, evalúa el presupuesto, guarda y reevalúa el par. El
      # patrón `save` + `evaluate!` + `reload` está derogado porque el reload
      # descartaba los tres campos presupuestales y dejaba todo gasto de
      # WhatsApp en `sin_presupuesto`.
      result = ExpenseBudgetService.persist_with_evaluation!(re, actor: creator)
      return text("Error: #{result.errors.join(', ')}") unless result.ok?

      json(Mcp::Serialize.record(re, ReportExpensesListTool::KEYS,
                                 budget_message: budget_message_for(re),
                                 rule_violations: re.rule_violations))
    ensure
      User.current = previous
    end
  end

  # Texto en español listo para que el agente lo repita TEXTUAL. Existe para que
  # el modelo no redacte por su cuenta el resultado presupuestal: "excedido" es
  # una advertencia con consecuencias contables, no una opinión.
  def self.budget_message_for(re)
    case re.budget_status
    when ExpenseBudgetService::STATUS_APROBADO
      "Aprobado contra presupuesto."
    when ExpenseBudgetService::STATUS_EXCEDIDO
      "ATENCION: #{re.budget_reason}. El gasto quedo registrado pero excede el presupuesto."
    else
      "Registrado. No hay partida presupuestal asignada para esta persona en este centro; " \
      "el gasto no quedo bajo control presupuestal."
    end
  end

  # De dónde salió la tasa. LO ESCRIBE EL SERVIDOR y no se expone en el schema:
  # el campo existe para auditar el origen del dato, y si el llamador lo declara
  # deja de significar algo.
  #
  # Si la tasa coincide con la fila cacheada de esa moneda y fecha, se hereda el
  # `source` de esa fila (`trm_oficial` para el dólar, `bce` para el euro:
  # llamar "TRM" a una tasa cruzada del BCE sería mentir en un dato contable).
  # Cualquier otro valor es `manual`, que es exactamente lo que es: un número
  # que dictó una persona.
  def self.resolve_rate_source(re)
    return nil unless Currency.foreign?(re.currency)
    return nil if re.exchange_rate.blank?

    fecha = re.exchange_rate_date || re.invoice_date
    fila = fecha && (ExchangeRate.find_by(currency: re.currency, rate_date: fecha) ||
                     ExchangeRate.where(currency: re.currency, effective_date: fecha).order(:rate_date).first)
    return "manual" if fila.nil?

    fila.rate_to_cop.to_d.round(6) == re.exchange_rate.to_d.round(6) ? fila.source : "manual"
  end
  private_class_method :resolve_rate_source

  # nil si el id es válido para su categoría (u omitido); el mensaje de rechazo
  # si no. `find_by` y no `find`: las tools nunca levantan. La comparación de
  # categoría es contra el valor almacenado tal cual (los datos del catálogo
  # son canónicos; la tolerancia de forma es para lo que escribe el modelo, no
  # para la columna).
  def self.option_error(campo, raw)
    return nil if raw.nil? || raw.to_s.strip.empty?

    esperada = OPTION_CATEGORIES[campo]
    opcion   = ReportExpenseOption.find_by(id: raw)
    return nil if opcion && opcion.category == esperada

    detalle = if opcion.nil?
                "no existe ninguna opción con ese id"
              else
                "esa opción es #{opcion.name.inspect}, de categoría #{opcion.category.inspect}"
              end
    "Error: #{campo} #{raw.inspect} no sirve: #{detalle}. Tiene que ser una opción de " \
    "categoría #{esperada.inspect}. Llama a report_expense_options_list con " \
    "category: #{esperada.inspect} y usa uno de los ids que devuelve. El gasto NO se registró."
  end
  private_class_method :option_error
end

# Unico lugar donde se evaluan las reglas de gasto (paquete 14).
#
# POR QUE UN SERVICIO Y NO UN `validate` DEL MODELO: este servicio EVALUA, no
# decide. Que una violacion frene el guardado o solo lo explique depende del
# flag `mandatory` de cada regla (pedido de producto, 2026-09-15), y quien
# aplica esa consecuencia es `ReportExpense#enforce_expense_rules`. Partirlo asi
# es lo que permite que la web, WhatsApp y el import de Excel compartan el
# veredicto y no cada uno su propia interpretacion.
#
# HISTORIA DE ESTE ARCHIVO, PORQUE EXPLICA LOS COMENTARIOS QUE QUEDAN ABAJO:
# hasta 2026-08-29 ninguna violacion impedia guardar, solo bajaba el gasto a
# "sin aprobar"; la adenda A.2 las volvio todas duras; el flag `mandatory` hace
# de eso una decision regla por regla y devuelve la rama blanda, que nunca se
# borro (`ReportExpense#apply_expense_rules`).
#
# LAS TRES REGLAS DETERMINISTAS SE EVALUAN AQUI Y SOLO AQUI, en el servidor.
# Si alguna se moviera al prompt del agente, un gasto creado por la web dejaria
# de validarse y apareceria una asimetria entre canales que nadie notaria hasta
# la auditoria contable.
class ExpenseRuleService
  # Codigos estables. Los consume la pantalla (para elegir el icono) y el agente
  # (para decidir que preguntar): cambiarlos rompe a los dos.
  CODE_TOO_OLD    = "invoice_too_old".freeze
  CODE_VALUE      = "invoice_value_exceeded".freeze
  CODE_DUPLICATE  = "duplicate_invoice".freeze

  # Result canonico del proyecto, identico al de ExpenseBudgetService
  # (00-ARQUITECTURA.md §4.2). `errors` es SIEMPRE un array.
  Result = Struct.new(:ok, :value, :errors, keyword_init: true) do
    def ok?    = ok
    def error? = !ok
  end

  # Evalua un gasto contra las reglas aplicables a su responsable.
  #
  # `expense` puede estar persistido o ser uno nuevo sin guardar: el agente
  # valida ANTES de crear. Si no se pasa `user`, se usa `expense.user_invoice`.
  #
  # => Result cuyo `value` es
  #    { ok: true/false,
  #      violations: [{ rule:, code:, message: }],           # la foto completa
  #      blocking_violations: [{ rule:, code:, message: }],  # las que FRENAN
  #      agent_instructions: "…texto concatenado…",           # lo aplica el agente
  #      applied_rules: ["Regla general"] }
  #
  # `ok` del Result y `ok` del value son lo mismo a proposito: quien solo quiera
  # saber si paso usa `result.ok?` y quien necesite el detalle abre el value.
  #
  # OJO CON `ok`: mira `violations`, NO `blocking_violations`. Un gasto que solo
  # incumple reglas blandas trae `ok: false` y se puede guardar igual. Quien
  # decide si guardar o no tiene que preguntar por `blocking_violations`.
  #
  # POR QUE DOS JUEGOS DE VIOLACIONES Y NO UN CAMPO `mandatory` EN CADA UNA:
  # `effective_limits` colapsa las N reglas de la persona en UN tope tomando el
  # minimo, asi que una violacion no tiene una regla dueña de la que heredar el
  # flag —por eso `violation` deja `rule` en nil—. La unica forma honesta de
  # saber que frena es volver a resolver los limites usando SOLO las reglas
  # obligatorias y evaluar contra esos.
  def self.validate(expense, user: nil)
    responsable = user || expense&.user_invoice
    reglas = ExpenseRule.aplicables_a(responsable).to_a

    limites = effective_limits(reglas)
    # Segundo juego de limites, con el mismo minimo pero solo sobre las reglas
    # que frenan. Al ser un subconjunto, su tope es siempre IGUAL O MAS FLOJO
    # que el efectivo: `blocking` nunca puede tener una violacion que no este
    # tambien —por el mismo code— en `violations`.
    limites_duros = effective_limits(reglas.select(&:mandatory))

    violations = []
    blocking   = []

    # Antiguedad y valor son calculo puro: evaluarlos dos veces no cuesta una
    # consulta y evita tener que adivinar de que regla salio cada violacion.
    violations.concat(check_age(expense, limites[:max_invoice_age_days]))
    blocking.concat(check_age(expense, limites_duros[:max_invoice_age_days]))
    violations.concat(check_value(expense, limites[:max_invoice_value]))
    blocking.concat(check_value(expense, limites_duros[:max_invoice_value]))

    # DUPLICADOS SE CONSULTA UNA SOLA VEZ: es el unico check que va a la base, y
    # correrlo dos veces duplicaria la consulta en cada guardado de cada gasto.
    # Se puede reusar el resultado porque el check no depende de ningun limite,
    # solo de si alguna regla lo pide.
    if limites[:check_duplicates]
      duplicado = check_duplicate(expense)
      violations.concat(duplicado)
      blocking.concat(duplicado) if limites_duros[:check_duplicates]
    end

    valor = {
      ok: violations.empty?,
      violations: violations,
      blocking_violations: blocking,
      agent_instructions: limites[:agent_instructions],
      applied_rules: reglas.map(&:name)
    }

    Result.new(ok: violations.empty?, value: valor, errors: violations.map { |v| v[:message] })
  end

  # Combina N reglas en UN juego de limites.
  #
  # GANA LA MAS RESTRICTIVA, y es una decision con consecuencias: la alternativa
  # —que la regla mas especifica sobrescriba a la general— permitiria que
  # asignarle una regla a alguien AFLOJE un control, que es justo lo contrario
  # de lo que espera quien administra.
  #
  #   * max_invoice_age_days y max_invoice_value: el MINIMO de los no nulos.
  #     `nil` significa "sin limite", asi que nunca puede ganar a un numero.
  #   * check_duplicates: activo si ALGUNA lo pide.
  #   * agent_instructions: se concatenan todas las no vacias, en orden de
  #     `name`, cada una en su propio parrafo.
  def self.effective_limits(reglas)
    reglas = Array(reglas)

    { max_invoice_age_days: reglas.map(&:max_invoice_age_days).compact.min,
      max_invoice_value: reglas.map(&:max_invoice_value).compact.min,
      check_duplicates: reglas.any?(&:check_duplicates),
      agent_instructions: reglas.sort_by { |r| r.name.to_s }
                                .map { |r| r.agent_instructions.to_s.strip }
                                .reject(&:empty?)
                                .join("\n\n") }
  end

  # Los limites ya resueltos de un usuario, para la pantalla y para el agente.
  def self.limits_for(user)
    effective_limits(ExpenseRule.aplicables_a(user).to_a)
  end

  # --- Reglas deterministas --------------------------------------------------

  # ANTIGUEDAD MEDIDA CONTRA Date.current, NUNCA CONTRA created_at. Si se midiera
  # contra la fecha de registro, una factura vieja registrada tarde pasaria el
  # filtro, que es exactamente el fraude que la regla quiere evitar.
  def self.check_age(expense, max_days)
    return [] if max_days.blank?
    # `invoice_date` nula: no se evalua y no se inventa una fecha. Un gasto sin
    # fecha es un dato incompleto, no una infraccion.
    return [] if expense&.invoice_date.blank?

    dias = (Date.current - expense.invoice_date.to_date).to_i
    return [] if dias <= max_days

    [violation(CODE_TOO_OLD, "El comprobante tiene #{dias} días y el máximo son #{max_days}")]
  end

  # El tope es INCLUSIVO: un gasto exactamente igual al tope NO viola. Un tope de
  # $200.000 que rechaza un gasto de $200.000 es incomprensible para quien lo
  # configura.
  def self.check_value(expense, max_value)
    return [] if max_value.blank?

    total = expense&.invoice_total.to_d
    return [] if total <= max_value.to_d

    [violation(CODE_VALUE, "El valor supera el tope de #{ExpenseBudgetService.money(max_value)}")]
  end

  # DUPLICADO SOLO CON invoice_number E identification AMBOS PRESENTES. Con
  # campos vacios, media base de datos seria "duplicada" entre si.
  def self.check_duplicate(expense)
    return [] if expense.blank?
    return [] if expense.invoice_number.blank? || expense.identification.blank?

    scope = ReportExpense.where(invoice_number: expense.invoice_number,
                                identification: expense.identification)
    # Al editar hay que excluir el propio registro o el gasto se acusa a si
    # mismo de duplicado en cada guardado.
    scope = scope.where.not(id: expense.id) if expense.id.present?

    otro = scope.order(:id).first
    return [] if otro.nil?

    [violation(CODE_DUPLICATE,
               "Ya existe el gasto ##{otro.id} con esa factura de ese proveedor")]
  end

  # `rule` se deja en nil porque el limite efectivo puede venir de la
  # combinacion de varias reglas y atribuirselo a una sola seria mentir; los
  # nombres de todas van en `applied_rules`.
  def self.violation(code, message, rule: nil)
    { rule: rule, code: code, message: message }
  end
  private_class_method :violation
end

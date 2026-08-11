# Unica fuente de verdad de la aritmetica presupuestal.
#
# POR QUE EXISTE: el estado presupuestal de un gasto (`sin_presupuesto` /
# `aprobado` / `excedido`) no es un dato que el usuario escriba, es un dato
# DERIVADO de tres cosas que cambian por separado: las partidas activas del par
# (centro, beneficiario), el valor de los gastos ya registrados de ese par y el
# orden en que se registraron. Si cada controller, cada tool MCP y cada job
# calculara eso por su cuenta, tendriamos tres aritmeticas distintas y ninguna
# forma de serializar dos escrituras simultaneas.
#
# LAS TRES REGLAS DE NEGOCIO QUE CODIFICA (00-ARQUITECTURA.md 2.6):
#   1. El "gastado" suma `invoice_value` (SIN IVA), nunca `invoice_total`.
#   2. Los gastos `excedido` NO consumen cupo; los `sin_presupuesto` SI.
#   3. La imputacion es FIFO por `created_at`: los gastos mas viejos conservan
#      el cupo y los mas nuevos son los que se caen a `excedido`.
#
# CONCURRENCIA: toda escritura pasa por `with_center_lock`, que toma un
# `SELECT ... FOR UPDATE` sobre la fila de `cost_centers`. No sobre
# `expense_budgets`: hay que serializar tambien el caso en que todavia no existe
# ninguna partida, y ahi no hay fila de `expense_budgets` que bloquear.
class ExpenseBudgetService
  STATUS_SIN_PRESUPUESTO = "sin_presupuesto".freeze
  STATUS_APROBADO        = "aprobado".freeze
  STATUS_EXCEDIDO        = "excedido".freeze

  # Los dos estados que el reevaluo FIFO puede escribir. `sin_presupuesto` NO
  # esta en la lista a proposito: un gasto historico consume cupo pero jamas
  # cambia de estado por un reevaluo (Discrepancia D2 del paquete 04). Sale de
  # `sin_presupuesto` unicamente cuando el propio gasto pasa por `evaluate!`.
  MANAGED_STATUSES = [STATUS_APROBADO, STATUS_EXCEDIDO].freeze

  # 5 s. No se sube: `config/database.yml` fija `pool: 5` y Puma corre 5 hilos,
  # asi que un lock retenido sin timeout cuelga hilos hasta agotar el pool.
  LOCK_TIMEOUT_MS = 5_000

  # `invoice_value` es FLOAT (invariante 2 de la arquitectura). Sumar floats en
  # Postgres acumula error: tres gastos de 33.333,33 dan 99.999,98999999999 y un
  # test de "cabe justo" falla por dos centesimos. Se castea a numeric y se
  # redondea POR FILA, no sobre la suma.
  SPENT_EXPR = Arel.sql("ROUND(CAST(report_expenses.invoice_value AS numeric), 2)")

  # Result canonico del proyecto (00-ARQUITECTURA.md 4.2, 7.4), identico en los
  # paquetes 04, 05 y 07. `errors` es SIEMPRE un array, nunca nil ni un `:error`
  # singular.
  #
  # El miembro se llama `ok` y no `ok?` por convencion del proyecto: `Struct.new(:ok?)`
  # es valido en Ruby 3.1, lo que NO es valido es el setter `ok?=`. Por eso
  # `keyword_init: true` y el predicado definido en el bloque.
  Result = Struct.new(:ok, :value, :errors, keyword_init: true) do
    def ok?    = ok
    def error? = !ok
  end

  # Formato de moneda de TODOS los mensajes del dominio. Los tests afirman el
  # string exacto y los E2E del paquete 12 lo buscan en pantalla: cambiarlo aqui
  # es cambiarlo en todas partes, que es justamente el punto.
  #
  #   money(3_700_000) => "$3.700.000"
  #   money(50_000.50) => "$50.000,50"
  def self.money(value)
    v = value.to_d.round(2)
    ActiveSupport::NumberHelper.number_to_currency(
      v, unit: "$", delimiter: ".", separator: ",",
         precision: (v.frac.zero? ? 0 : 2), format: "%u%n"
    )
  end

  # Serializa las escrituras presupuestales de uno o varios centros.
  #
  # TRES DECISIONES QUE NO SE PUEDEN CAMBIAR:
  #
  # 1. La fila bloqueada es `cost_centers`, no `expense_budgets`. Es el unico
  #    punto de serializacion que cubre los cuatro casos: dos partidas contra el
  #    mismo tope, dos gastos contra la misma partida, un gasto y una edicion de
  #    partida a la vez, y dos gastos cuando TODAVIA NO EXISTE ninguna partida.
  # 2. Se bloquea de a una fila y en orden de id ASCENDENTE. Mover un gasto de
  #    centro obliga a bloquear dos; sin orden fijo, dos requests inversos
  #    (A->B y B->A) producen deadlock. No se usa
  #    `CostCenter.lock.where(id: [...]).order(:id)`: Postgres puede tomar los
  #    locks en orden de scan, ANTES del sort.
  # 3. Nada de HTTP, subida de archivos ni `recalculate_cost_center` dentro del
  #    bloque. El pool de AR es 5.
  def self.with_center_lock(*cost_center_ids, lock_timeout_ms: LOCK_TIMEOUT_MS)
    ids = cost_center_ids.compact.map(&:to_i).uniq.sort

    ActiveRecord::Base.transaction do
      ActiveRecord::Base.connection.execute("SET LOCAL lock_timeout = '#{lock_timeout_ms.to_i}ms'")
      ids.each { |id| CostCenter.lock.find(id) }
      yield
    end
  rescue ActiveRecord::LockWaitTimeout
    Result.new(ok: false, value: nil,
               errors: ["El centro de costos está siendo actualizado por otra operación. Intente nuevamente"])
  rescue ActiveRecord::RecordNotFound
    Result.new(ok: false, value: nil, errors: ["El centro de costos no existe"])
  end
  private_class_method :with_center_lock

  # --- Lectura (sin lock) ----------------------------------------------------

  # Foto del cupo de UN par (centro, beneficiario).
  #
  #   => { has_budget: true/false, assigned: BigDecimal, spent: BigDecimal, available: BigDecimal }
  #
  # `exclude_expense_id` sirve para evaluar un gasto que YA existe sin que se
  # cuente contra si mismo: al subir un gasto de 100.000 a 150.000 hay que
  # comparar 150.000 contra el disponible SIN los 100.000 viejos, o cualquier
  # edicion al alza quedaria excedida.
  #
  # No abre transaccion ni toma lock: es una lectura. Los llamadores que
  # necesitan consistencia (el propio servicio) ya estan dentro del lock.
  def self.available_for(cost_center_id:, user_id:, exclude_expense_id: nil)
    if cost_center_id.blank? || user_id.blank?
      return { has_budget: false, assigned: BigDecimal(0), spent: BigDecimal(0), available: BigDecimal(0) }
    end

    partidas = ExpenseBudget.activas.para(cost_center_id, user_id)
    assigned = partidas.sum(:amount).to_d.round(2)
    # `exists?` y no `assigned > 0`: el flag responde "hay partida", no "hay
    # plata". Una partida activa de $0 no deberia existir (la validacion lo
    # impide), pero si existiera el usuario tiene presupuesto asignado, no
    # ausencia de presupuesto.
    has_budget = partidas.exists?

    scope = ReportExpense.where(cost_center_id: cost_center_id, user_invoice_id: user_id)
                         .where.not(budget_status: STATUS_EXCEDIDO)
    # TRAMPA: `where.not(id: nil)` devuelve CERO filas, no todas. Con un gasto
    # nuevo (id nil) el spent daria 0 y todo gasto quedaria aprobado.
    scope = scope.where.not(id: exclude_expense_id) if exclude_expense_id.present?
    spent = scope.sum(SPENT_EXPR).to_d.round(2)

    # `available` PUEDE ser negativo y se devuelve negativo. Como pintarlo lo
    # decide el frontend; el dominio no miente.
    { has_budget: has_budget, assigned: assigned, spent: spent, available: (assigned - spent).round(2) }
  end

  # Resumen presupuestal de un centro completo, para el tablero del paquete 08
  # (via el 07). Lectura pura, sin lock.
  #
  #   => { cost_center: { id:, code:, viatic_value: },
  #        totals:      { viatic_value:, assigned:, unassigned:, spent:, available: },
  #        by_user:     [ { user_id:, user_name:, assigned:, spent:, available:,
  #                         budgets_count:, exceeded_expenses_count: } ] }
  #
  # Son CUATRO queries agrupadas y ningun bucle con N queries: un centro con 30
  # beneficiarios no puede costar 90 consultas para pintar una tabla.
  def self.summary_for_center(cost_center_id)
    centro = CostCenter.find_by(id: cost_center_id)

    asignado_por_usuario = ExpenseBudget.activas.where(cost_center_id: cost_center_id)
                                        .group(:user_id).sum(:amount)
    partidas_por_usuario = ExpenseBudget.activas.where(cost_center_id: cost_center_id)
                                        .group(:user_id).count
    gastado_por_usuario  = ReportExpense.where(cost_center_id: cost_center_id)
                                        .where.not(budget_status: STATUS_EXCEDIDO)
                                        .group(:user_invoice_id).sum(SPENT_EXPR)
    excedidos_por_usuario = ReportExpense.where(cost_center_id: cost_center_id,
                                                budget_status: STATUS_EXCEDIDO)
                                         .group(:user_invoice_id).count

    # La union y no solo los beneficiarios con partida: quien gasto en el centro
    # sin tener partida asignada es precisamente el caso que el tablero tiene que
    # dejar ver.
    ids = (asignado_por_usuario.keys + gastado_por_usuario.keys + excedidos_por_usuario.keys).compact.uniq
    nombres = User.where(id: ids).pluck(:id, :names).to_h

    by_user = ids.map do |uid|
      asignado = asignado_por_usuario.fetch(uid, 0).to_d.round(2)
      gastado  = gastado_por_usuario.fetch(uid, 0).to_d.round(2)
      { user_id: uid,
        user_name: nombres[uid],
        assigned: asignado,
        spent: gastado,
        available: (asignado - gastado).round(2),
        budgets_count: partidas_por_usuario.fetch(uid, 0),
        exceeded_expenses_count: excedidos_por_usuario.fetch(uid, 0) }
    end.sort_by { |fila| fila[:user_name].to_s }

    viaticos        = centro&.viatic_value.to_d.round(2)
    asignado_total  = asignado_por_usuario.values.sum.to_d.round(2)
    gastado_total   = gastado_por_usuario.values.sum.to_d.round(2)

    { cost_center: { id: centro&.id, code: centro&.code, viatic_value: viaticos },
      totals: { viatic_value: viaticos,
                assigned: asignado_total,
                # Lo que del tope todavia no esta repartido en partidas. Puede
                # ser negativo solo si alguien forzo datos por fuera del modelo.
                unassigned: (viaticos - asignado_total).round(2),
                spent: gastado_total,
                available: (asignado_total - gastado_total).round(2) },
      by_user: by_user }
  end

  # Setea el actor de los callbacks de auditoria y lo restaura pase lo que pase.
  #
  # Es imprescindible porque los callbacks de ReportExpense y ExpenseBudget leen
  # `User.current`, que solo existe dentro de un request web. Este es el UNICO
  # lugar del servicio donde se toca `User.current`: en todo lo demas el actor
  # entra por parametro (00-ARQUITECTURA.md 4.2).
  def self.with_actor(actor)
    previous = User.current
    User.current = actor
    yield
  ensure
    User.current = previous
  end
  private_class_method :with_actor
end

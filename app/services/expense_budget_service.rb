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

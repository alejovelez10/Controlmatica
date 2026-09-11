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
#   1. El "gastado" suma `invoice_value` (SIN IVA), nunca el total con IVA.
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

  # QUE CONSUME CUPO. Unico sitio donde se responde esa pregunta. Vivia repetido
  # como `where.not(budget_status: EXCEDIDO)` en TRES consultas —el disponible de
  # la pantalla, el tablero del centro y el motor FIFO— y bastaba con que una se
  # quedara atras para que los tres numeros dejaran de cuadrar entre si.
  #
  # LA REGLA CAMBIO (2026-09-10). Antes consumia todo lo que no estuviera
  # excedido, incluido un gasto recien creado que nadie habia mirado. Ahora
  # consume LA ACEPTACION: el gasto se registra sin tocar el presupuesto y
  # descuenta cuando el responsable lo pasa a "Aceptado" —aunque eso deje el cupo
  # en negativo, que es explicitamente lo que se quiere: el gasto ya ocurrio y la
  # factura hay que pagarla igual.
  #
  # Se combina con `auto_accept_if_within_budget` (before_create del modelo): lo
  # que cabe nace aceptado y por tanto descuenta de una; lo que no cabe, o no
  # tiene partida, nace en "Creado" y espera a que alguien lo acepte.
  def self.consumidores(scope)
    scope.where(is_acepted: true)
  end

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
  # 3. Nada de HTTP, subida de archivos ni recalculos de centro dentro del
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

    scope = consumidores(ReportExpense.where(cost_center_id: cost_center_id, user_invoice_id: user_id))
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
    gastado_por_usuario  = consumidores(ReportExpense.where(cost_center_id: cost_center_id))
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

  # --- Evaluacion de UN gasto -----------------------------------------------

  # Asigna budget_status / budget_reason / expense_budget_id EN MEMORIA. No
  # guarda, no abre transaccion. Debe invocarse DENTRO de with_center_lock.
  # Idempotente: llamarlo dos veces sobre el mismo gasto da el mismo resultado.
  # Devuelve el propio expense.
  def self.evaluate!(expense, actor: nil)
    # `ReportExpense.import` puede dejar estas dos FK nulas cuando el Excel trae
    # un nombre que no resuelve. Reventar aqui haria que un import de 300 filas
    # se caiga por una.
    if expense.cost_center_id.blank? || expense.user_invoice_id.blank?
      return asignar(expense, STATUS_SIN_PRESUPUESTO, nil, nil)
    end

    budget = ExpenseBudget.activas
                          .para(expense.cost_center_id, expense.user_invoice_id)
                          .antiguas_primero.first
    return asignar(expense, STATUS_SIN_PRESUPUESTO, nil, nil) if budget.nil?

    disponible = available_for(cost_center_id: expense.cost_center_id,
                               user_id: expense.user_invoice_id,
                               exclude_expense_id: expense.id)[:available]
    # Un invoice_value negativo es dato invalido, no un credito: se trata como 0
    # para que no genere cupo de la nada.
    valor = [expense.invoice_value.to_d.round(2), 0].max

    if valor <= 0 || valor <= disponible
      asignar(expense, STATUS_APROBADO, nil, budget.id)
    else
      # El expense_budget_id se llena TAMBIEN en excedido: es informativo y da
      # trazabilidad de contra que partida no alcanzo.
      asignar(expense, STATUS_EXCEDIDO,
              "Excede el presupuesto disponible en #{money(valor - disponible)}", budget.id)
    end
  end

  # PUNTO DE ENTRADA UNICO para guardar un gasto: toma el lock, evalua, guarda y
  # reevalua el par (y el par de origen, si el gasto se movio de centro o de
  # responsable).
  #
  # Lo usan el controller del paquete 07 y la tool MCP del paquete 11. El patron
  # `save` + `evaluate!` + `reload` queda derogado: pierde los tres valores en el
  # reload y deja en `sin_presupuesto` todo gasto creado por WhatsApp.
  def self.persist_with_evaluation!(expense, actor:, previous_cost_center_id: nil,
                                    previous_user_invoice_id: nil)
    with_center_lock(expense.cost_center_id, previous_cost_center_id) do
      guardado = with_actor(actor) do
        evaluate!(expense, actor: actor)
        expense.save
      end

      # Un gasto EXCEDIDO se guarda igual: el excedido se informa, no se
      # bloquea. Aqui solo se corta por errores de validacion reales.
      next Result.new(ok: false, value: expense, errors: expense.errors.full_messages) unless guardado

      if previous_cost_center_id.present? &&
         (previous_cost_center_id != expense.cost_center_id ||
          previous_user_invoice_id != expense.user_invoice_id)
        # El par de ORIGEN libera cupo: un gasto que estaba excedido alli puede
        # volver a caber.
        perform_reevaluation(previous_cost_center_id, previous_user_invoice_id)
      end

      perform_reevaluation(expense.cost_center_id, expense.user_invoice_id)
      # perform_reevaluation escribe con update_columns, asi que el objeto en
      # memoria quedo viejo.
      expense.reload

      Result.new(ok: true, value: expense, errors: [])
    end
  end

  # Se llama DESPUES de destruir el gasto, con el par capturado ANTES (despues el
  # objeto ya no sirve).
  #
  # Eliminar un gasto LIBERA CUPO: sin este reevaluo, un gasto posterior que
  # habia quedado excedido se queda marcado asi para siempre y desaparece de la
  # vista de contabilidad sin razon.
  def self.on_expense_destroyed!(cost_center_id:, user_id:, actor: nil)
    with_center_lock(cost_center_id) { perform_reevaluation(cost_center_id, user_id) }
  end

  # Reevaluo FIFO de un par, tomando el lock. Envoltorio publico de
  # perform_reevaluation para quien no venga de una escritura de gasto.
  def self.reevaluate_center_user!(cost_center_id:, user_id:, actor: nil)
    with_center_lock(cost_center_id) { perform_reevaluation(cost_center_id, user_id) }
  end

  # Reparte el cupo del par entre sus gastos, del mas viejo al mas nuevo.
  #
  # ASUME QUE EL LOCK YA ESTA TOMADO y NO abre transaccion propia. Es la unica
  # forma de que create_budget! y persist_with_evaluation! la reusen sin anidar
  # transacciones ni volver a pedir el mismo lock. Es privada justamente para que
  # nadie la llame suelta: correria sin lock y la concurrencia se romperia en
  # silencio.
  #
  # => Result(ok: true, value: <cantidad de gastos que cambiaron>, errors: [])
  def self.perform_reevaluation(cost_center_id, user_id)
    return Result.new(ok: true, value: 0, errors: []) if cost_center_id.blank? || user_id.blank?

    asignado = ExpenseBudget.activas.para(cost_center_id, user_id).sum(:amount).to_d.round(2)
    budget   = ExpenseBudget.activas.para(cost_center_id, user_id).antiguas_primero.first

    corriendo = BigDecimal(0)
    cambiados = 0

    # `.each` y NO `find_each`: find_each ignora el order y fuerza el suyo por
    # id. El FIFO depende de created_at, y con created_at seteado a mano (las
    # fixtures lo hacen) los dos ordenes no coinciden. Son decenas de filas por
    # persona, no millones.
    gastos = ReportExpense.where(cost_center_id: cost_center_id, user_invoice_id: user_id)
                          .order(created_at: :asc, id: :asc)

    gastos.each do |gasto|
      valor = [gasto.invoice_value.to_d.round(2), 0].max

      # SOLO LO ACEPTADO CONSUME (ver `consumidores`). `corriendo` es el cupo ya
      # comprometido, asi que un gasto en "Creado" no lo mueve: existe, se ve en
      # la tabla y no le quita plata a nadie hasta que alguien lo acepte.
      consume = gasto.is_acepted?

      # Un historico consume cupo pero NUNCA cambia de estado por un reevaluo
      # (Discrepancia D2). Si cambiara, editar una partida podria empujar a
      # `excedido` a un gasto historico y sacarlo de la vista de contabilidad,
      # que es exactamente lo que la decision de no tocar historicos evitaba.
      if MANAGED_STATUSES.exclude?(gasto.budget_status)
        corriendo += valor if consume
        next
      end

      destino =
        if budget.nil?
          corriendo += valor if consume
          [STATUS_SIN_PRESUPUESTO, nil, nil]
        elsif valor <= 0 || corriendo + valor <= asignado
          resultado = [STATUS_APROBADO, nil, budget.id]
          corriendo += valor if consume
          resultado
        else
          # EL ACEPTADO QUE SE PASA TAMBIEN CONSUME, y el cupo queda en negativo.
          # Antes `corriendo` no se incrementaba nunca en esta rama ("lo que no
          # cabe no consume"), de modo que un excedido no gastaba y los gastos
          # siguientes volvian a caber contra una plata que en realidad ya estaba
          # comprometida. El exceso se calcula ANTES de incrementar: si no, el
          # mensaje reportaria el sobrante contandose a si mismo.
          exceso = corriendo + valor - asignado
          corriendo += valor if consume
          [STATUS_EXCEDIDO,
           "Excede el presupuesto disponible en #{money(exceso)}", budget.id]
        end

      next if [gasto.budget_status, gasto.budget_reason, gasto.expense_budget_id] == destino

      # `update_columns` y no `update`: salta validaciones Y callbacks. Sin eso,
      # cada gasto tocado dispararia `edit_values` (pisando el
      # last_user_edited_id con el actor equivocado) y la auditoria del concern
      # del paquete 03, y una edicion de partida con 40 gastos ensuciaria la
      # pantalla de notificaciones con 41 registros. Ademas, al escribir solo
      # cuando el destino difiere, el reevaluo es idempotente y no produce ruido
      # en updated_at.
      gasto.update_columns(budget_status: destino[0], budget_reason: destino[1],
                           expense_budget_id: destino[2], updated_at: Time.current)
      cambiados += 1
    end

    Result.new(ok: true, value: cambiados, errors: [])
  end
  private_class_method :perform_reevaluation

  # --- CRUD de partidas ------------------------------------------------------

  # `user_id` es el BENEFICIARIO. JAMAS se le pasa el actor: el actor va en
  # `created_by_id` y solo ahi. Confundirlos le daria a cada jefe el presupuesto
  # de todo su equipo.
  #
  # `lock_timeout_ms` existe SOLO para que el test de concurrencia pueda esperar
  # 300 ms en vez de 5 s por un lock que sabe que esta tomado. Ningun llamador de
  # produccion lo pasa: el default es el LOCK_TIMEOUT_MS del servicio.
  def self.create_budget!(cost_center_id:, user_id:, amount:, notes: nil, actor:,
                          lock_timeout_ms: LOCK_TIMEOUT_MS)
    with_center_lock(cost_center_id, lock_timeout_ms: lock_timeout_ms) do
      budget = ExpenseBudget.new(cost_center_id: cost_center_id, user_id: user_id,
                                 amount: amount, notes: notes, active: true,
                                 created_by_id: actor&.id)

      # La validacion de tope corre DENTRO del lock: ese es el punto entero del
      # bloqueo. Dos partidas simultaneas que por separado caben, juntas no.
      guardado = with_actor(actor) { budget.save }

      next Result.new(ok: false, value: budget, errors: budget.errors.full_messages) unless guardado

      # Una partida nueva puede rescatar gastos que estaban en excedido.
      perform_reevaluation(cost_center_id, user_id)
      Result.new(ok: true, value: budget, errors: [])
    end
  end

  # Solo se aplican amount / notes / active. Mover una partida de centro o de
  # beneficiario cambiaria retroactivamente el cupo de DOS pares y dejaria
  # gastos imputados a una partida que ya no les corresponde: se anula y se crea
  # otra, que ademas deja rastro en la auditoria.
  #
  # La transicion activa -> inactiva NO es un update cualquiera: es una
  # ANULACION y tiene su propia regla de negocio (ver anular_budget!).
  def self.update_budget!(budget, attrs, actor:)
    attrs = (attrs || {}).symbolize_keys

    if cambia_de_par?(budget, attrs)
      return Result.new(ok: false, value: budget,
                        errors: ["No se puede cambiar el centro de costos ni el beneficiario " \
                                 "de una partida; anule esta y cree otra"])
    end

    permitidos = attrs.slice(:amount, :notes, :active)

    with_center_lock(budget.cost_center_id) do
      # DENTRO del lock: la anulacion lee lo gastado y decide el monto con ese
      # numero. Leerlo fuera permitiria que un gasto simultaneo la deje corta.
      next anular_budget!(budget, permitidos, actor: actor) if anulacion?(budget, permitidos)

      guardado = with_actor(actor) { budget.update(permitidos) }

      next Result.new(ok: false, value: budget, errors: budget.errors.full_messages) unless guardado

      # REDUCIR el monto por debajo de lo ya gastado SE PERMITE: la validacion de
      # tope solo mira hacia arriba. Los gastos que ya no caben pasan a excedido
      # en este reevaluo. Bloquear la edicion dejaria al jefe sin forma de
      # corregir una partida inflada por error.
      perform_reevaluation(budget.cost_center_id, budget.user_id)
      Result.new(ok: true, value: budget, errors: [])
    end
  end

  # --- Anulacion de partidas -------------------------------------------------
  #
  # "Anular" NO es siempre `active = false`. Lo que se puede devolver al centro
  # es unicamente lo que la partida todavia NO tiene ejecutado, asi que la regla
  # mira lo GASTADO y se abre en tres casos:
  #
  #   gastado = 0            -> anulacion completa: active = false.
  #   0 < gastado < monto    -> NO se desactiva. Se recorta `amount` a lo gastado,
  #                             la partida SIGUE ACTIVA y el disponible del par
  #                             queda en cero. Se libera al centro lo no usado.
  #   gastado >= monto       -> no hay saldo que liberar: no se cambia nada y se
  #                             informa.
  #
  # EL CASO DEL MEDIO ES EL QUE SOSTIENE EL TOPE, y por eso la partida no se
  # desactiva: `ExpenseBudget.cap_violation_for` suma SOLO las partidas ACTIVAS
  # del centro. Desactivar una partida con gasto ejecutado sacaria ese dinero del
  # tope —el centro creeria tener mas margen del que tiene— y ademas dejaria sus
  # gastos sin partida activa a la que imputarse.
  #
  # QUE SE ENTIENDE POR "GASTADO": el gastado del PAR (centro, beneficiario), que
  # es la misma magnitud que la tabla muestra en la columna "Gastado" y la unica
  # que el dominio calcula (2.6: no hay imputacion parcial entre partidas, asi
  # que prorratear entre varias seria inventar un numero). Con varias partidas
  # activas del mismo par la regla queda CONSERVADORA: puede recortar de mas o
  # negarse a anular, pero nunca libera plata que ya se gasto, que es el unico
  # error que rompe el tope del centro.
  def self.anular_budget!(budget, permitidos, actor:)
    monto   = budget.amount.to_d.round(2)
    gastado = available_for(cost_center_id: budget.cost_center_id, user_id: budget.user_id)[:spent]

    if gastado >= monto
      return Result.new(ok: false, value: budget, errors: [mensaje_sin_saldo(gastado, monto)])
    end

    # El `amount` que venga en el body se DESCARTA: en una anulacion el monto no
    # lo elige el usuario, lo decide lo ya ejecutado. `notes` si se respeta.
    cambios = permitidos.except(:amount, :active)
    cambios = gastado <= 0 ? cambios.merge(active: false) : cambios.merge(amount: gastado)

    mensaje = gastado <= 0 ? mensaje_anulacion_total(monto) : mensaje_anulacion_parcial(gastado, monto)
    # ANTES del save: el callback de auditoria del modelo lo lee para escribir el
    # encabezado de anulacion en vez del de edicion.
    budget.mensaje_anulacion = mensaje

    guardado = with_actor(actor) { budget.update(cambios) }

    unless guardado
      # Se limpia para que un reintento sobre el mismo objeto en memoria no
      # arrastre el mensaje de un intento que no llego a guardarse.
      budget.mensaje_anulacion = nil
      return Result.new(ok: false, value: budget, errors: budget.errors.full_messages)
    end

    # Anular libera cupo (o lo deja exacto): los gastos del par se reparten otra
    # vez. Sin esto, un gasto que estaba excedido se quedaria excedido para
    # siempre y uno aprobado seguiria apuntando a una partida ya anulada.
    perform_reevaluation(budget.cost_center_id, budget.user_id)
    Result.new(ok: true, value: budget, errors: [])
  end
  private_class_method :anular_budget!

  # Solo es anulacion la transicion de ACTIVA a inactiva de una partida ya
  # guardada. Reenviar `active: false` sobre una partida que ya esta anulada no
  # vuelve a disparar la regla.
  def self.anulacion?(budget, permitidos)
    return false unless permitidos.key?(:active)
    return false unless budget.persisted? && budget.active?

    # El controller reenvia `params[:active]` crudo y en un form-encoded llega el
    # STRING "false", que sin castear es truthy en Ruby y dejaria pasar la
    # anulacion como una edicion normal.
    ActiveModel::Type::Boolean.new.cast(permitidos[:active]) == false
  end
  private_class_method :anulacion?

  # Los tres mensajes viven aqui, no en el controller ni en el frontend: la
  # pantalla los muestra tal cual y los tests afirman el string exacto.
  def self.mensaje_anulacion_total(monto)
    "La partida fue anulada: no tenía gastos ejecutados, así que se liberaron " \
      "#{money(monto)} al centro de costos"
  end
  private_class_method :mensaje_anulacion_total

  def self.mensaje_anulacion_parcial(gastado, monto)
    "La partida tenía #{money(gastado)} ejecutados: se recortó de #{money(monto)} a " \
      "#{money(gastado)} y sigue activa para respaldar ese gasto. Se liberaron " \
      "#{money(monto - gastado)} al centro de costos"
  end
  private_class_method :mensaje_anulacion_parcial

  def self.mensaje_sin_saldo(gastado, monto)
    "La partida ya tiene #{money(gastado)} ejecutados sobre #{money(monto)} asignados: " \
      "no hay saldo por liberar y no se realizó ningún cambio"
  end
  private_class_method :mensaje_sin_saldo

  def self.destroy_budget!(budget, actor:)
    # Se capturan ANTES: despues del destroy el objeto ya no sirve para
    # reevaluar.
    cc = budget.cost_center_id
    u  = budget.user_id

    with_center_lock(cc) do
      # `destroy` y no `delete`: dispara la auditoria de eliminacion y el
      # dependent: :nullify que deja expense_budget_id en NULL.
      guardado = with_actor(actor) { budget.destroy }

      next Result.new(ok: false, value: budget, errors: budget.errors.full_messages) unless guardado

      # Reimputa a la siguiente partida activa si queda alguna, o deja todo en
      # sin_presupuesto si no queda ninguna.
      perform_reevaluation(cc, u)
      Result.new(ok: true, value: budget, errors: [])
    end
  end

  # Envoltorio publico y SIN lock, para que un controller pueda pre-validar y
  # mostrar el mensaje antes de intentar guardar. La regla vive en el modelo.
  #
  # => nil | String
  def self.validate_cap!(budget)
    ExpenseBudget.cap_violation_for(cost_center: budget.cost_center, amount: budget.amount,
                                    active: budget.active,
                                    exclude_id: (budget.persisted? ? budget.id : nil))
  end

  def self.cambia_de_par?(budget, attrs)
    (attrs.key?(:cost_center_id) && attrs[:cost_center_id].to_i != budget.cost_center_id) ||
      (attrs.key?(:user_id) && attrs[:user_id].to_i != budget.user_id)
  end
  private_class_method :cambia_de_par?

  def self.asignar(expense, status, reason, budget_id)
    expense.budget_status     = status
    expense.budget_reason     = reason
    expense.expense_budget_id = budget_id
    expense
  end
  private_class_method :asignar

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

# CABLEADO OBLIGATORIO (lo implementa el paquete 07; el 11 usa el mismo punto de entrada):
#
#   create:  expense = ReportExpense.new(report_expense_params_create)
#            result  = ExpenseBudgetService.persist_with_evaluation!(expense, actor: current_user)
#
#   update:  prev_cc = @report_expense.cost_center_id
#            prev_u  = @report_expense.user_invoice_id
#            @report_expense.assign_attributes(report_expense_params_update)
#            result  = ExpenseBudgetService.persist_with_evaluation!(
#                        @report_expense, actor: current_user,
#                        previous_cost_center_id: prev_cc, previous_user_invoice_id: prev_u)
#
#   destroy: cc = @report_expense.cost_center_id; u = @report_expense.user_invoice_id
#            @report_expense.destroy
#            ExpenseBudgetService.on_expense_destroyed!(cost_center_id: cc, user_id: u, actor: current_user)
#
#   recalculate_cost_center(...) se sigue llamando en el controller, DESPUES y FUERA del
#   servicio: es un helper de controller que depende de la ivar @cost_center y no puede vivir
#   dentro de una transaccion con lock.
#
# NO ES DOCUMENTACION DECORATIVA, ES UN CONTRATO EXIGIBLE. Sin este cableado,
# `budget_status` nunca se calcula por la via web: el tablero del paquete 08, las
# columnas del 09 y la vista de contabilidad del 06 muestran datos falsos con
# total confianza. Y el `save` + `evaluate!` + `reload` que se uso antes queda
# derogado: el reload pierde los tres valores recien calculados y deja en
# `sin_presupuesto` todo gasto creado por WhatsApp.
#
# En el destroy, el par (cost_center_id, user_invoice_id) se captura ANTES del
# `destroy`: despues el objeto ya no sirve para reevaluar.

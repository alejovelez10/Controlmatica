require "test_helper"

# CRUD de partidas a traves del servicio: `create_budget!`, `update_budget!`,
# `destroy_budget!` y `validate_cap!`.
#
# Lo que este archivo defiende, ademas del comportamiento, es EL LOCK. Los dos
# ultimos tests capturan el SQL real que emite cada camino de escritura y exigen
# ver un `SELECT ... FOR UPDATE` sobre `cost_centers`. Son deterministas y
# baratos: si alguien "simplifica" el servicio quitando el bloqueo, estos fallan
# SIEMPRE, mientras que los tests de dos hilos fallan solo a veces.
class ExpenseBudgetServiceCapTest < ActiveSupport::TestCase
  # El texto exacto que el contrato A.5 publica y que el E2E del paquete 12
  # busca en pantalla. Se escribe aqui completo, no interpolado, justamente para
  # que un cambio accidental de formato no pase desapercibido.
  MENSAJE_TOPE = "La suma de las partidas ($1.000.001) supera el valor de viáticos del centro " \
                 "de costos ($1.000.000). Disponible para asignar: $400.000".freeze

  MENSAJE_SIN_VIATICOS = "El centro de costos no tiene valor de viáticos cotizado; " \
                         "no es posible asignar partidas".freeze

  MENSAJE_CAMBIO_DE_PAR = "No se puede cambiar el centro de costos ni el beneficiario " \
                          "de una partida; anule esta y cree otra".freeze

  setup do
    @admin      = users(:admin)
    @ingeniero  = users(:ingeniero)
    # centro_ajeno: viatic_value 1.000.000 y sin partidas en las fixtures, asi
    # que su cupo esta entero y los montos del mensaje son predecibles.
    @centro     = cost_centers(:centro_ajeno)
    @centro_sin = cost_centers(:centro_sin_viaticos)   # viatic_value nil
  end

  # --- create_budget! -------------------------------------------------------

  def test_create_budget_ok
    resultado = ExpenseBudgetService.create_budget!(cost_center_id: @centro.id,
                                                    user_id: @ingeniero.id,
                                                    amount: 400_000, notes: "Viaticos junio",
                                                    actor: @admin)

    assert_predicate resultado, :ok?
    assert_predicate resultado.value, :persisted?
    assert_empty resultado.errors
    # El actor va en created_by_id y SOLO ahi. `user_id` es el BENEFICIARIO:
    # confundirlos le daria a cada jefe el presupuesto de todo su equipo.
    assert_equal @admin.id, resultado.value.created_by_id
    assert_equal @ingeniero.id, resultado.value.user_id
  end

  def test_create_budget_supera_tope
    ExpenseBudgetService.create_budget!(cost_center_id: @centro.id, user_id: @ingeniero.id,
                                        amount: 600_000, actor: @admin)

    assert_no_difference("ExpenseBudget.count") do
      @resultado = ExpenseBudgetService.create_budget!(cost_center_id: @centro.id,
                                                       user_id: @ingeniero.id,
                                                       amount: 400_001, actor: @admin)
    end

    assert_predicate @resultado, :error?
    assert_equal MENSAJE_TOPE, @resultado.errors.first
  end

  def test_create_budget_centro_sin_viaticos
    resultado = ExpenseBudgetService.create_budget!(cost_center_id: @centro_sin.id,
                                                    user_id: @ingeniero.id,
                                                    amount: 1_000, actor: @admin)

    assert_predicate resultado, :error?
    assert_equal MENSAJE_SIN_VIATICOS, resultado.errors.first
  end

  def test_create_budget_el_tope_es_por_centro_y_no_por_par
    # Todo el cupo del centro se lo lleva OTRO beneficiario.
    ExpenseBudgetService.create_budget!(cost_center_id: @centro.id, user_id: users(:contador).id,
                                        amount: 1_000_000, actor: @admin)

    resultado = ExpenseBudgetService.create_budget!(cost_center_id: @centro.id,
                                                    user_id: @ingeniero.id,
                                                    amount: 1, actor: @admin)

    # El ingeniero no tiene ni una partida propia y aun asi no cabe: el tope se
    # controla por agregado del CENTRO (1.1), no por par.
    assert_predicate resultado, :error?
  end

  # --- update_budget! -------------------------------------------------------

  def test_update_budget_rechaza_cambio_de_cost_center_id
    budget = crear_partida(400_000)

    resultado = ExpenseBudgetService.update_budget!(budget,
                                                    { cost_center_id: cost_centers(:centro_con_viaticos).id },
                                                    actor: @admin)

    assert_predicate resultado, :error?
    assert_equal MENSAJE_CAMBIO_DE_PAR, resultado.errors.first
    # Mover una partida de centro cambiaria retroactivamente el cupo de DOS
    # pares y dejaria gastos imputados a una partida que ya no les corresponde.
    assert_equal @centro.id, budget.reload.cost_center_id
  end

  def test_update_budget_rechaza_cambio_de_user_id
    budget = crear_partida(400_000)

    resultado = ExpenseBudgetService.update_budget!(budget, { user_id: users(:contador).id },
                                                    actor: @admin)

    assert_predicate resultado, :error?
    assert_equal MENSAJE_CAMBIO_DE_PAR, resultado.errors.first
    assert_equal @ingeniero.id, budget.reload.user_id
  end

  def test_update_budget_ignora_claves_no_permitidas
    budget = crear_partida(400_000)
    creador_original = budget.created_by_id

    resultado = ExpenseBudgetService.update_budget!(budget,
                                                    { amount: 500_000, created_by_id: users(:contador).id },
                                                    actor: @admin)

    assert_predicate resultado, :ok?
    assert_equal BigDecimal("500000.0"), budget.reload.amount
    # Solo amount / notes / active pasan el filtro: el resto se ignora en
    # silencio en vez de dejar que un parametro colado reescriba la auditoria.
    assert_equal creador_original, budget.created_by_id
  end

  # --- destroy_budget! ------------------------------------------------------

  def test_destroy_budget_ok
    budget = crear_partida(400_000)

    resultado = ExpenseBudgetService.destroy_budget!(budget, actor: @admin)

    assert_predicate resultado, :ok?
    assert_not ExpenseBudget.exists?(budget.id)
  end

  # --- validate_cap! --------------------------------------------------------

  def test_validate_cap_devuelve_nil_cuando_cabe
    budget = ExpenseBudget.new(cost_center: @centro, user: @ingeniero, amount: 400_000)

    assert_nil ExpenseBudgetService.validate_cap!(budget)
  end

  def test_validate_cap_devuelve_el_mensaje_cuando_no_cabe
    crear_partida(600_000)
    budget = ExpenseBudget.new(cost_center: @centro, user: @ingeniero, amount: 400_001)

    # Envoltorio publico y SIN lock: el controller pre-valida y muestra el
    # mensaje antes de intentar guardar.
    assert_equal MENSAJE_TOPE, ExpenseBudgetService.validate_cap!(budget)
  end

  # --- El lock, capturado del SQL real --------------------------------------

  def test_create_budget_emite_select_for_update_sobre_cost_centers
    sqls = capturar_sql do
      ExpenseBudgetService.create_budget!(cost_center_id: @centro.id, user_id: @ingeniero.id,
                                          amount: 400_000, actor: @admin)
    end

    assert sqls.any? { |s| s =~ /FOR UPDATE/ && s =~ /cost_centers/ },
           "create_budget! tiene que tomar SELECT ... FOR UPDATE sobre cost_centers. " \
           "SQL capturado:\n#{sqls.join("\n")}"
  end

  def test_persist_with_evaluation_emite_select_for_update
    gasto = ReportExpense.new(
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        omitir_comprobante_obligatorio: true, user_id: @admin.id, cost_center_id: @centro.id,
                              user_invoice_id: @ingeniero.id, invoice_name: "Gasto con lock",
                              invoice_date: Date.new(2026, 6, 1), invoice_value: 10_000,
                              invoice_tax: 0, invoice_total: 10_000)

    sqls = capturar_sql { ExpenseBudgetService.persist_with_evaluation!(gasto, actor: @admin) }

    # El camino del gasto tiene que serializarse igual que el de la partida: dos
    # gastos simultaneos contra la misma partida son la carrera mas probable de
    # las cuatro.
    assert sqls.any? { |s| s =~ /FOR UPDATE/ && s =~ /cost_centers/ },
           "persist_with_evaluation! tiene que tomar SELECT ... FOR UPDATE sobre cost_centers. " \
           "SQL capturado:\n#{sqls.join("\n")}"
  end

  private

  def crear_partida(amount)
    ExpenseBudgetService.create_budget!(cost_center_id: @centro.id, user_id: @ingeniero.id,
                                        amount: amount, actor: @admin).value
  end

  def capturar_sql
    sqls = []
    subscriptor = ActiveSupport::Notifications.subscribe("sql.active_record") do |*, payload|
      sqls << payload[:sql]
    end
    yield
    sqls
  ensure
    ActiveSupport::Notifications.unsubscribe(subscriptor)
  end
end

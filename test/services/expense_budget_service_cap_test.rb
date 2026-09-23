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

  # --- Los gastos sin aceptar se reservan del tope (2026-09-22) -------------

  def test_gasto_sin_aceptar_baja_lo_que_se_puede_asignar
    crear_gasto_sin_aceptar(300_000)

    # 1.000.000 de cotizado - 300.000 reservados: 700.000 entra justo.
    assert_predicate crear_partida_resultado(700_000), :ok?
  end

  def test_gasto_sin_aceptar_bloquea_lo_que_antes_cabia
    crear_gasto_sin_aceptar(300_000)

    resultado = crear_partida_resultado(700_001)

    assert_predicate resultado, :error?
    # El mensaje dice CUANTO esta reservado y por que: sin eso, el usuario ve un
    # disponible menor que el cotizado y no sabe de donde sale.
    assert_equal "La suma de las partidas ($700.001) supera lo que se puede asignar en el centro " \
                 "de costos: del valor de viáticos ($1.000.000) se reservan $300.000 en gastos " \
                 "creados sin aceptar. Disponible para asignar: $700.000",
                 resultado.errors.first
  end

  def test_gasto_aceptado_no_reserva_porque_ya_descuenta_del_cupo
    gasto = crear_gasto_sin_aceptar(300_000)
    gasto.update!(is_acepted: true)

    # Aceptado pasa a `spent` y sale de la reserva: el cotizado vuelve a estar
    # entero para repartir. Contarlo dos veces seria el error a evitar.
    assert_predicate crear_partida_resultado(1_000_000), :ok?
  end

  def test_bajar_una_partida_sigue_siendo_posible_con_el_tope_ya_rebasado
    partida = crear_partida(900_000)
    crear_gasto_sin_aceptar(500_000)   # deja el tope efectivo en 500.000

    # Subir NO: el escape solo deja pasar lo que no aumenta el total asignado.
    assert_predicate ExpenseBudgetService.update_budget!(partida, { amount: 950_000 }, actor: @admin), :error?
    # Bajar SI, aunque 800.000 siga por encima del tope efectivo. Sin esto la
    # partida quedaria atrapada y el centro congelado.
    assert_predicate ExpenseBudgetService.update_budget!(partida, { amount: 800_000 }, actor: @admin), :ok?
  end

  def test_summary_for_center_publica_pending_y_assignable
    crear_partida(200_000)
    crear_gasto_sin_aceptar(300_000)

    totales = ExpenseBudgetService.summary_for_center(@centro.id)[:totals]

    assert_equal BigDecimal("300000.0"), totales[:pending]
    # 1.000.000 - 200.000 asignados - 300.000 reservados.
    assert_equal BigDecimal("500000.0"), totales[:assignable]
    # `unassigned` NO cambia de significado: sigue siendo cotizado - asignado.
    assert_equal BigDecimal("800000.0"), totales[:unassigned]
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
    crear_partida_resultado(amount).value
  end

  def crear_partida_resultado(amount)
    ExpenseBudgetService.create_budget!(cost_center_id: @centro.id, user_id: @ingeniero.id,
                                        amount: amount, actor: @admin)
  end

  # Gasto en "Creado". Se crea SIN partida a la vista para que el
  # `auto_accept_if_within_budget` del modelo no lo acepte solo: lo que cabe
  # nace aceptado, y un gasto aceptado ya no reserva, descuenta.
  def crear_gasto_sin_aceptar(valor)
    as_user(@admin) do
      ReportExpense.create!(omitir_comprobante_obligatorio: true,
                            user_id: @admin.id, cost_center_id: @centro.id,
                            user_invoice_id: @ingeniero.id, invoice_name: "Gasto sin aceptar",
                            invoice_date: Date.new(2026, 6, 1), invoice_value: valor,
                            invoice_tax: 0, invoice_total: valor)
    end
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

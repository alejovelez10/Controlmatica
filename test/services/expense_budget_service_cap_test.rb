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

  # --- Lo aceptado sin partida sale del tope (2026-09-24) -------------------

  def test_gasto_sin_aceptar_no_reserva_nada
    crear_gasto(300_000, aceptado: false)

    # Controlmatica los considera plata libre: el cotizado sigue entero.
    assert_predicate crear_partida_resultado(1_000_000), :ok?
  end

  def test_gasto_aceptado_sin_partida_baja_lo_que_se_puede_asignar
    crear_gasto(300_000, aceptado: true)

    assert_predicate crear_partida_resultado(700_000), :ok?
  end

  def test_gasto_aceptado_sin_partida_bloquea_lo_que_antes_cabia
    crear_gasto(300_000, aceptado: true)

    resultado = crear_partida_resultado(700_001)

    assert_predicate resultado, :error?
    assert_equal "La suma de las partidas ($700.001) supera lo que se puede asignar en el centro " \
                 "de costos: del valor de viáticos ($1.000.000) ya se consumieron $300.000 en gastos " \
                 "aceptados sin partida que los cubra. Disponible para asignar: $700.000",
                 resultado.errors.first
  end

  def test_gasto_aceptado_que_cabe_en_la_partida_no_descuenta_dos_veces
    crear_partida(400_000)
    crear_gasto(300_000, aceptado: true)

    # El gasto ya esta contado DENTRO de los 400.000 de la partida: lo que queda
    # por repartir siguen siendo 600.000, no 300.000. Por eso el compromiso es
    # el MAXIMO entre asignado y gastado, y no la suma.
    assert_equal BigDecimal("600000.0"), ExpenseBudgetService.assignable_limit_for(cost_center: @centro)
    assert_predicate crear_partida_resultado(600_000), :ok?
  end

  def test_el_compromiso_no_se_presta_entre_beneficiarios
    contador = users(:contador)
    crear_partida(400_000)                                   # al ingeniero, sin gastar
    crear_gasto(300_000, aceptado: true, user: contador)     # el contador gasto sin partida

    # 1.000.000 - 400.000 del ingeniero - 300.000 que el contador ya consumio.
    assert_equal BigDecimal("300000.0"), ExpenseBudgetService.assignable_limit_for(cost_center: @centro)
  end

  def test_bajar_una_partida_sigue_siendo_posible_con_el_tope_ya_rebasado
    partida = crear_partida(900_000)
    crear_gasto(950_000, aceptado: true)   # se paso de su propia partida

    assert_predicate ExpenseBudgetService.update_budget!(partida, { amount: 950_000 }, actor: @admin), :error?
    # Bajar SI: sin este escape la partida quedaria atrapada y el centro
    # congelado.
    assert_predicate ExpenseBudgetService.update_budget!(partida, { amount: 800_000 }, actor: @admin), :ok?
  end

  def test_summary_for_center_publica_uncovered_y_assignable
    crear_partida(200_000)
    crear_gasto(300_000, aceptado: true)

    totales = ExpenseBudgetService.summary_for_center(@centro.id)[:totals]

    # Gastado 300.000 contra 200.000 asignados: 100.000 sin respaldo.
    assert_equal BigDecimal("100000.0"), totales[:uncovered]
    assert_equal BigDecimal("700000.0"), totales[:assignable]
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

  # `aceptado:` se fija DESPUES de crear y no en el create: el
  # `auto_accept_if_within_budget` del modelo decide solo en el alta segun quepa
  # o no en la partida, y estos tests necesitan el estado que piden, no el que
  # salga.
  def crear_gasto(valor, aceptado:, user: @ingeniero)
    gasto = as_user(@admin) do
      ReportExpense.create!(omitir_comprobante_obligatorio: true,
                            user_id: @admin.id, cost_center_id: @centro.id,
                            user_invoice_id: user.id, invoice_name: "Gasto de prueba",
                            invoice_date: Date.new(2026, 6, 1), invoice_value: valor,
                            invoice_tax: 0, invoice_total: valor)
    end
    gasto.update_columns(is_acepted: aceptado)
    gasto
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

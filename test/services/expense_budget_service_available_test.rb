require "test_helper"

# `available_for` es la definicion operativa de "cuanta plata le queda a esta
# persona en este centro". Todo lo demas del paquete se apoya en ella, asi que
# los cuatro puntos de la decision 2.6 se prueban uno por uno:
#
#   1. el gastado suma `invoice_value` (SIN IVA), nunca `invoice_total`;
#   2. todo en COP;
#   3. los gastos `excedido` NO cuentan;
#   4. los gastos `sin_presupuesto` SI cuentan.
class ExpenseBudgetServiceAvailableTest < ActiveSupport::TestCase
  setup do
    @admin     = users(:admin)
    @ingeniero = users(:ingeniero)
    @centro    = cost_centers(:centro_con_viaticos)

    # Par LIMPIO: `centro_ajeno` no tiene partidas ni gastos en las fixtures, asi
    # que cada test arma exactamente el escenario que quiere medir.
    @centro_lab = cost_centers(:centro_ajeno)     # viatic_value 1.000.000
    @user_lab   = users(:ingeniero_dos)
  end

  def crear_partida(amount, cost_center: @centro_lab, user: @user_lab)
    as_user(@admin) do
      ExpenseBudget.create!(cost_center: cost_center, user: user, amount: amount,
                            created_by_id: @admin.id)
    end
  end

  def crear_gasto(valor, cost_center: @centro_lab, user: @user_lab, **overrides)
    as_user(@admin) do
      ReportExpense.create!({ user_id: @admin.id, cost_center_id: cost_center.id,
                              user_invoice_id: user.id, invoice_name: "Gasto de prueba",
                              invoice_date: Date.new(2026, 6, 1), invoice_value: valor,
                              invoice_tax: 0, invoice_total: valor }.merge(overrides))
    end
  end

  def disponible(**overrides)
    ExpenseBudgetService.available_for(**{ cost_center_id: @centro_lab.id,
                                           user_id: @user_lab.id }.merge(overrides))
  end

  def test_sin_partidas_devuelve_has_budget_false
    resultado = disponible

    assert_equal false, resultado[:has_budget]
    assert_equal BigDecimal(0), resultado[:assigned]
    assert_equal BigDecimal(0), resultado[:spent]
    assert_equal BigDecimal(0), resultado[:available]
  end

  def test_suma_solo_partidas_activas
    # El par de las fixtures tiene 500.000 + 200.000 activas y 900.000 INACTIVA.
    # Si la inactiva contara, el asignado seria 1.600.000.
    resultado = ExpenseBudgetService.available_for(cost_center_id: @centro.id, user_id: @ingeniero.id)

    assert_equal BigDecimal("700000.0"), resultado[:assigned]
    assert_equal true, resultado[:has_budget]
  end

  def test_suma_invoice_value_y_no_invoice_total
    crear_partida(500_000)
    crear_gasto(100_000, invoice_tax: 19_000, invoice_total: 119_000)

    # DECISION 2.6 numero 1: el presupuesto se controla SIN IVA. Con
    # invoice_total el gastado seria 119.000 y el cliente veria consumido un 19%
    # de mas.
    assert_equal BigDecimal("100000.0"), disponible[:spent]
  end

  def test_excluye_los_excedidos_del_gastado
    crear_partida(100_000)
    crear_gasto(80_000, budget_status: "excedido", budget_reason: "Excede el presupuesto disponible en $80.000")

    # Un gasto excedido NO consume cupo: si lo consumiera, un solo gasto grande
    # dejaria excedidos a todos los siguientes en cascada.
    assert_equal BigDecimal(0), disponible[:spent]
  end

  def test_incluye_los_sin_presupuesto_del_gastado
    crear_partida(100_000)
    crear_gasto(80_000, budget_status: "sin_presupuesto")

    # DECISION 0.1 del cliente: los historicos SI consumen presupuesto. Es la
    # unica lectura que no le regala cupo a quien ya gasto antes de que existiera
    # el modulo.
    assert_equal BigDecimal("80000.0"), disponible[:spent]
  end

  def test_incluye_los_aprobados_del_gastado
    crear_partida(100_000)
    crear_gasto(80_000, budget_status: "aprobado")

    assert_equal BigDecimal("80000.0"), disponible[:spent]
  end

  def test_respeta_exclude_expense_id
    crear_partida(100_000)
    gasto = crear_gasto(80_000, budget_status: "aprobado")

    assert_equal BigDecimal(0), disponible(exclude_expense_id: gasto.id)[:spent]
  end

  def test_exclude_expense_id_nil_no_filtra_nada
    crear_partida(100_000)
    crear_gasto(80_000, budget_status: "aprobado")

    # TRAMPA #1: si el codigo hace `where.not(id: nil)` sin condicionar, en SQL
    # `id <> NULL` es NULL y la consulta devuelve CERO filas. El sintoma seria
    # que todo gasto nuevo (id nil) queda aprobado porque el gastado da 0.
    assert_equal disponible[:spent], disponible(exclude_expense_id: nil)[:spent]
    assert_equal BigDecimal("80000.0"), disponible(exclude_expense_id: nil)[:spent]
  end

  def test_no_mezcla_otros_usuarios_ni_otros_centros
    crear_partida(500_000)
    crear_gasto(70_000, budget_status: "aprobado")
    crear_gasto(90_000, user: @ingeniero, budget_status: "aprobado")               # otro beneficiario
    crear_gasto(90_000, cost_center: @centro, budget_status: "aprobado")           # otro centro

    assert_equal BigDecimal("70000.0"), disponible[:spent]
  end

  def test_devuelve_bigdecimal
    crear_partida(100_000)
    crear_gasto(80_000, budget_status: "aprobado")
    resultado = disponible

    # `invoice_value` es float y `amount` decimal: mezclarlos sin convertir es la
    # via directa a comparar 99.999,98999999999 con 100.000.
    assert_kind_of BigDecimal, resultado[:assigned]
    assert_kind_of BigDecimal, resultado[:spent]
    assert_kind_of BigDecimal, resultado[:available]
  end

  def test_disponible_negativo_cuando_lo_gastado_supera_lo_asignado
    crear_partida(100_000)
    crear_gasto(150_000, budget_status: "aprobado")

    # El disponible negativo se devuelve negativo. Truncarlo en 0 esconderia
    # exactamente el dato que el jefe necesita ver.
    assert_equal BigDecimal("-50000.0"), disponible[:available]
  end

  # --- summary_for_center ---------------------------------------------------
  #
  # La tabla de pruebas del paquete no traia ni un caso para este metodo, y es la
  # unica fuente del tablero de presupuesto del paquete 08 (via el 07). Se
  # agregan tres: la forma del hash es un contrato entre paquetes y no puede
  # quedar sin guardian.

  def test_summary_for_center_devuelve_los_totales_anidados
    resumen = ExpenseBudgetService.summary_for_center(@centro.id)

    # Las tres claves de primer nivel. La forma PLANA anterior
    # ({cost_center:, viatic_value:, assigned:, ...}) quedo derogada: no es la
    # que consume BudgetSummaryBoard.
    assert_equal %i[cost_center totals by_user], resumen.keys
    assert_equal @centro.id, resumen[:cost_center][:id]
    assert_equal @centro.code, resumen[:cost_center][:code]
    assert_equal BigDecimal("5000000.0"), resumen[:totals][:viatic_value]

    # 500.000 + 200.000 del ingeniero + 300.000 del contador. La inactiva de
    # 900.000 no suma.
    assert_equal BigDecimal("1000000.0"), resumen[:totals][:assigned]
    # Lo que del tope todavia no esta repartido en partidas.
    assert_equal BigDecimal("4000000.0"), resumen[:totals][:unassigned]
    # Los dos gastos de las fixtures, de 100.000 cada uno.
    assert_equal BigDecimal("200000.0"), resumen[:totals][:spent]
    assert_equal BigDecimal("800000.0"), resumen[:totals][:available]
  end

  def test_summary_for_center_desglosa_por_beneficiario
    fila = ExpenseBudgetService.summary_for_center(@centro.id)[:by_user]
           .find { |f| f[:user_id] == @ingeniero.id }

    assert_equal @ingeniero.names, fila[:user_name]
    assert_equal BigDecimal("700000.0"), fila[:assigned]
    assert_equal BigDecimal("200000.0"), fila[:spent]
    assert_equal BigDecimal("500000.0"), fila[:available]
    # Solo las ACTIVAS del par: la inactiva no se cuenta.
    assert_equal 2, fila[:budgets_count]
    assert_equal 0, fila[:exceeded_expenses_count]
  end

  def test_summary_for_center_incluye_a_quien_gasto_sin_partida_y_cuenta_excedidos
    # Beneficiario sin ninguna partida en el centro: si el tablero lo omitiera,
    # el gasto de alguien sin presupuesto asignado seria invisible.
    crear_gasto(50_000, cost_center: @centro, user: @user_lab, budget_status: "sin_presupuesto")
    crear_gasto(90_000, cost_center: @centro, user: @user_lab, budget_status: "excedido")

    fila = ExpenseBudgetService.summary_for_center(@centro.id)[:by_user]
           .find { |f| f[:user_id] == @user_lab.id }

    assert_equal BigDecimal(0), fila[:assigned]
    # El excedido no suma al gastado, pero SI se cuenta aparte.
    assert_equal BigDecimal("50000.0"), fila[:spent]
    assert_equal 0, fila[:budgets_count]
    assert_equal 1, fila[:exceeded_expenses_count]
  end
end

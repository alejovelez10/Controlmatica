require "test_helper"

# `evaluate!` decide el estado presupuestal de UN gasto contra el cupo del par,
# y `persist_with_evaluation!` es el punto de entrada unico para guardarlo.
#
# El invariante que estos tests protegen: un gasto EXCEDIDO se guarda igual. El
# presupuesto informa, no bloquea. Un gasto que el ingeniero ya pago no puede
# quedarse sin registrar porque el jefe no actualizo la partida.
class ExpenseBudgetServiceEvaluateTest < ActiveSupport::TestCase
  setup do
    @admin      = users(:admin)
    @ingeniero  = users(:ingeniero)
    @centro     = cost_centers(:centro_con_viaticos)

    # Par limpio, sin partidas ni gastos en las fixtures.
    @centro_lab = cost_centers(:centro_ajeno)
    @user_lab   = users(:ingeniero_dos)
  end

  def crear_partida(amount, active: true, cost_center: @centro_lab, user: @user_lab)
    as_user(@admin) do
      ExpenseBudget.create!(cost_center: cost_center, user: user, amount: amount,
                            active: active, created_by_id: @admin.id)
    end
  end

  def atributos_gasto(valor, cost_center: @centro_lab, user: @user_lab, **overrides)
    { user_id: @admin.id,
      cost_center_id: cost_center&.id,
      user_invoice_id: user&.id,
      invoice_name: "Gasto de prueba",
      invoice_date: Date.new(2026, 6, 1),
      invoice_value: valor,
      invoice_tax: 0,
      invoice_total: valor }.merge(overrides)
  end

  def nuevo_gasto(valor, **overrides)
    ReportExpense.new(
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        atributos_gasto(valor, **overrides).merge(omitir_comprobante_obligatorio: true))
  end

  def crear_gasto(valor, **overrides)
    as_user(@admin) { ReportExpense.create!(
        atributos_gasto(valor, **overrides).merge(omitir_comprobante_obligatorio: true)) }
  end

  # --- evaluate! ------------------------------------------------------------

  def test_sin_partida_queda_sin_presupuesto
    gasto = ExpenseBudgetService.evaluate!(nuevo_gasto(100_000))

    assert_equal "sin_presupuesto", gasto.budget_status
    assert_nil gasto.budget_reason
    assert_nil gasto.expense_budget_id
  end

  def test_cabe_queda_aprobado
    crear_partida(500_000)
    gasto = ExpenseBudgetService.evaluate!(nuevo_gasto(100_000))

    assert_equal "aprobado", gasto.budget_status
    assert_nil gasto.budget_reason
  end

  def test_cabe_justo_queda_aprobado
    crear_partida(500_000)

    # El limite es inclusivo: gastar exactamente el cupo asignado esta aprobado.
    assert_equal "aprobado", ExpenseBudgetService.evaluate!(nuevo_gasto(500_000)).budget_status
  end

  def test_se_pasa_por_un_peso_queda_excedido
    crear_partida(500_000)

    assert_equal "excedido", ExpenseBudgetService.evaluate!(nuevo_gasto(500_001)).budget_status
  end

  def test_el_gasto_excedido_se_guarda_igual
    crear_partida(100_000)
    gasto = nuevo_gasto(500_000)

    resultado = ExpenseBudgetService.persist_with_evaluation!(gasto, actor: @admin)

    # El presupuesto informa, no bloquea.
    assert_predicate resultado, :ok?
    assert_predicate resultado.value, :persisted?
    assert_equal "excedido", resultado.value.budget_status
  end

  def test_texto_exacto_de_budget_reason
    crear_partida(100_000)
    gasto = ExpenseBudgetService.evaluate!(nuevo_gasto(150_000))

    # Este texto sale a pantalla y lo busca el E2E del paquete 12. Sin punto
    # final, con el monto formateado por `money`.
    assert_equal "Excede el presupuesto disponible en $50.000", gasto.budget_reason
  end

  def test_budget_reason_con_decimales
    crear_partida(100_000)
    gasto = ExpenseBudgetService.evaluate!(nuevo_gasto(150_000.50))

    assert_equal "Excede el presupuesto disponible en $50.000,50", gasto.budget_reason
  end

  def test_imputa_a_la_partida_activa_mas_antigua
    # El par de las fixtures tiene dos partidas activas; la de enero es la que
    # recibe la imputacion aunque la de febrero tenga cupo de sobra.
    gasto = ExpenseBudgetService.evaluate!(nuevo_gasto(100_000, cost_center: @centro, user: @ingeniero))

    assert_equal expense_budgets(:activa_ingeniero).id, gasto.expense_budget_id
  end

  def test_excedido_tambien_guarda_expense_budget_id
    partida = crear_partida(100_000)
    gasto = ExpenseBudgetService.evaluate!(nuevo_gasto(500_000))

    # Informativo: da trazabilidad de contra que partida NO alcanzo.
    assert_equal "excedido", gasto.budget_status
    assert_equal partida.id, gasto.expense_budget_id
  end

  def test_partida_inactiva_no_da_cupo
    crear_partida(900_000, active: false)
    gasto = ExpenseBudgetService.evaluate!(nuevo_gasto(100_000))

    assert_equal "sin_presupuesto", gasto.budget_status
    assert_nil gasto.expense_budget_id
  end

  def test_gasto_de_valor_cero_queda_aprobado_y_no_consume
    crear_partida(100_000)
    gasto = ExpenseBudgetService.persist_with_evaluation!(nuevo_gasto(0), actor: @admin).value

    assert_equal "aprobado", gasto.budget_status
    assert_equal BigDecimal("100000.0"),
                 ExpenseBudgetService.available_for(cost_center_id: @centro_lab.id,
                                                    user_id: @user_lab.id)[:available]
  end

  def test_gasto_sin_cost_center_o_sin_user_invoice_no_revienta
    crear_partida(100_000)

    # `ReportExpense.import` puede dejar estas FK nulas cuando el Excel trae un
    # nombre que no resuelve: reventar aqui tumbaria un import de 300 filas por
    # culpa de una.
    gasto = nil
    assert_nothing_raised { gasto = ExpenseBudgetService.evaluate!(nuevo_gasto(100_000, user: nil)) }
    assert_equal "sin_presupuesto", gasto.budget_status

    otro = nil
    assert_nothing_raised { otro = ExpenseBudgetService.evaluate!(nuevo_gasto(100_000, cost_center: nil)) }
    assert_equal "sin_presupuesto", otro.budget_status
  end

  def test_editar_gasto_no_se_cuenta_contra_si_mismo
    crear_partida(200_000)
    gasto = ExpenseBudgetService.persist_with_evaluation!(nuevo_gasto(100_000), actor: @admin).value
    assert_equal "aprobado", gasto.budget_status

    gasto.invoice_value = 150_000
    resultado = ExpenseBudgetService.persist_with_evaluation!(gasto, actor: @admin)

    # Si se contara contra si mismo, 100.000 + 150.000 > 200.000 y quedaria
    # excedido: toda edicion al alza seria imposible.
    assert_equal "aprobado", resultado.value.budget_status
  end

  def test_persist_devuelve_result_error_si_el_gasto_es_invalido
    invalido = nuevo_gasto(100_000, cost_center: nil)

    assert_no_difference("ReportExpense.count") do
      @resultado = ExpenseBudgetService.persist_with_evaluation!(invalido, actor: @admin)
    end

    assert_predicate @resultado, :error?
    assert_predicate @resultado.errors, :any?
    # `errors` es SIEMPRE array en el Result canonico, nunca nil ni un singular.
    assert_kind_of Array, @resultado.errors
  end

  def test_evaluate_es_idempotente
    crear_partida(100_000)
    gasto = crear_gasto(150_000)

    ExpenseBudgetService.evaluate!(gasto)
    primero = [gasto.budget_status, gasto.budget_reason, gasto.expense_budget_id]

    ExpenseBudgetService.evaluate!(gasto)
    segundo = [gasto.budget_status, gasto.budget_reason, gasto.expense_budget_id]

    # Lo exige por contrato el paquete 11: la tool MCP puede reintentar y no
    # puede producir un estado distinto en el segundo intento.
    assert_equal primero, segundo
    assert_equal "excedido", gasto.budget_status
  end
end

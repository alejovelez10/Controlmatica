require "test_helper"

# Cableado de ExpenseBudgetService en ReportExpensesController (tarea 23 del
# paquete 07). Es la prueba de la correccion mas importante de la auditoria.
#
# POR QUE ES UN ARCHIVO APARTE Y NO UN PAR DE CASOS EN EL TEST DEL CONTROLLER:
# lo que se verifica aqui no es el JSON de la respuesta sino un EFECTO EN LA
# BASE sobre gastos que el request ni siquiera menciona. Un `update` que cambia
# de centro tiene que reevaluar el par de ORIGEN, y el unico testigo de eso es
# un tercer gasto que estaba excedido y vuelve a "aprobado". Sin este archivo,
# alguien puede borrar los dos `previous_*` del controller y toda la suite sigue
# verde.
#
# CUPO DE LAS FIXTURES (centro_con_viaticos / ingeniero):
#   partidas activas ..... 500.000 + 200.000 = 700.000
#   gastos preexistentes .. report_expenses(:one) y (:two), 100.000 cada uno
#   Los dos estan en `sin_presupuesto`, que SI consume cupo (§2.6 regla 2).
#   => disponible al empezar cada test: 500.000
class ReportExpensesBudgetWiringTest < ActionDispatch::IntegrationTest
  DISPONIBLE_INICIAL = 500_000

  setup do
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    @otro = users(:ingeniero_dos)
    @centro = cost_centers(:centro_con_viaticos)
    @centro_ajeno = cost_centers(:centro_ajeno)

    # `create`/`update`/`destroy` de gastos llaman a recalculate_cost_center, que
    # hace update sobre el centro y dispara CostCenter#change_state. Ese callback
    # multiplica hour_cotizada * eng_hours sin guarda de nil y revienta con las
    # fixtures tal cual vienen. Es deuda preexistente del legado (el modelo
    # CostCenter no es de este paquete y las fixtures son del 01): se rellenan
    # los dos campos aqui en vez de tocar archivos ajenos.
    [@centro, @centro_ajeno].each { |c| c.update_columns(hour_cotizada: 0.0, eng_hours: 0.0) }

    sign_in_as @admin
  end

  # Parametros minimos de un gasto valido por la via web.
  def parametros_gasto(**overrides)
    {
      cost_center_id: @centro.id,
      user_invoice_id: @ingeniero.id,
      invoice_name: "Hotel Cableado",
      invoice_date: "2026-06-10",
      description: "Alojamiento",
      invoice_number: "FE-W#{SecureRandom.hex(3)}",
      identification: "900111222",
      invoice_value: 100_000,
      invoice_tax: 0,
      invoice_total: 100_000
    }.merge(overrides)
  end

  # Crea el gasto POR LA VIA WEB (no con ReportExpense.create!): el objeto de
  # este archivo es justamente el camino HTTP.
  def crear_por_web(**overrides)
    post report_expenses_path, params: parametros_gasto(**overrides)
    assert_response :success
    ReportExpense.order(:id).last
  end

  # --- create ---------------------------------------------------------------

  test "create en centro con partida y cupo deja budget_status aprobado" do
    gasto = crear_por_web(invoice_value: DISPONIBLE_INICIAL - 1)

    assert_equal "aprobado", gasto.budget_status,
                 "El gasto cabe en el cupo: sin el cableado queda en sin_presupuesto"
    assert_nil gasto.budget_reason
    assert_equal expense_budgets(:activa_ingeniero).id, gasto.expense_budget_id,
                 "Se imputa a la partida MAS ANTIGUA del par (FIFO)"
  end

  test "create con cupo insuficiente deja excedido con budget_reason" do
    gasto = crear_por_web(invoice_value: DISPONIBLE_INICIAL + 250_000)

    assert_equal "excedido", gasto.budget_status
    refute_nil gasto.budget_reason
    refute_empty gasto.budget_reason
    assert_includes gasto.budget_reason, "Excede el presupuesto disponible"
    # El expense_budget_id se llena TAMBIEN en excedido: es informativo y da
    # trazabilidad de contra que partida no alcanzo.
    assert_equal expense_budgets(:activa_ingeniero).id, gasto.expense_budget_id
  end

  test "create sin partida deja sin_presupuesto" do
    # ingeniero_dos no tiene ninguna partida en este centro.
    gasto = crear_por_web(user_invoice_id: @otro.id, invoice_value: 10_000)

    assert_equal "sin_presupuesto", gasto.budget_status
    assert_nil gasto.budget_reason
    assert_nil gasto.expense_budget_id
  end

  test "el JSON de create devuelve el estado presupuestal ya calculado" do
    # Sin esto la pantalla tiene que recargar la tabla para enterarse de que el
    # gasto que acaba de crear esta excedido.
    crear_por_web(invoice_value: DISPONIBLE_INICIAL + 100_000)

    registro = assert_json_success
    assert_equal "excedido", registro["budget_status"]
    refute_nil registro["budget_reason"]
  end

  # --- update ---------------------------------------------------------------

  # Deja el par (centro_con_viaticos, ingeniero) exprimido: `grande` se come todo
  # el cupo y `chico` queda excedido detras de el.
  def montar_par_saturado
    grande = crear_por_web(invoice_value: DISPONIBLE_INICIAL)
    chico  = crear_por_web(invoice_value: 50_000)

    assert_equal "aprobado", grande.reload.budget_status
    assert_equal "excedido", chico.reload.budget_status, "montaje: el segundo gasto debe quedar excedido"
    [grande, chico]
  end

  test "update que cambia de centro reevalua el centro anterior" do
    grande, chico = montar_par_saturado

    patch report_expense_path(grande), params: { cost_center_id: @centro_ajeno.id }
    assert_response :success

    assert_equal "aprobado", chico.reload.budget_status,
                 "Al sacar el gasto grande del centro se libera cupo: si `previous_cost_center_id` " \
                 "se leyera DESPUES del assign_attributes, el par de origen no se reevaluaria"
    # Y el gasto movido queda sin partida en el centro nuevo.
    assert_equal @centro_ajeno.id, grande.reload.cost_center_id
    assert_equal "sin_presupuesto", grande.budget_status
  end

  test "update que cambia de responsable reevalua al responsable anterior" do
    grande, chico = montar_par_saturado

    patch report_expense_path(grande), params: { user_invoice_id: @otro.id }
    assert_response :success

    assert_equal "aprobado", chico.reload.budget_status,
                 "Al cambiar de responsable se libera el cupo del responsable anterior"
    assert_equal @otro.id, grande.reload.user_invoice_id
    assert_equal "sin_presupuesto", grande.budget_status,
                 "ingeniero_dos no tiene partida en este centro"
  end

  test "update que sube el valor por encima del cupo deja el gasto excedido" do
    gasto = crear_por_web(invoice_value: 10_000)
    assert_equal "aprobado", gasto.budget_status

    patch report_expense_path(gasto), params: { invoice_value: DISPONIBLE_INICIAL + 200_000 }
    assert_response :success

    assert_equal "excedido", gasto.reload.budget_status
    refute_empty gasto.budget_reason.to_s
  end

  # --- destroy --------------------------------------------------------------

  test "destroy libera el cupo del par centro-usuario" do
    grande, chico = montar_par_saturado

    delete report_expense_path(grande)
    assert_response :success

    assert_equal "aprobado", chico.reload.budget_status,
                 "on_expense_destroyed! no se llamo: un gasto excedido se queda marcado para siempre"
  end

  test "destroy recalcula el centro de costos" do
    gasto = crear_por_web(invoice_value: 123_000)
    antes = @centro.reload.viat_costo_real.to_f

    delete report_expense_path(gasto)
    assert_response :success

    assert_in_delta antes - 123_000, @centro.reload.viat_costo_real.to_f, 0.01,
                    "El destroy no llamo a recalculate_cost_center: viat_costo_real queda inflado"
  end
end

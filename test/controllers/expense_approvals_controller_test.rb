require "test_helper"

# Aprobacion desde el enlace del correo, SIN sesion.
#
# LA PRUEBA MAS IMPORTANTE DE ESTE ARCHIVO es la de que el GET no aprueba nada.
# Los antivirus de correo y los prefetchers VISITAN los enlaces de un correo: si
# el GET mutara —como hace el `aprobar_informe` viejo— los gastos se aprobarian
# solos, sin que nadie hiciera clic, y no habria forma de entender por que.
class ExpenseApprovalsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @centro = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
    @dueno = users(:dueno_centro)

    @gasto = as_user(users(:admin)) do
      ReportExpense.create!(user: users(:admin),
                            cost_center: @centro,
                            user_invoice: users(:ingeniero),
                            invoice_name: "Hotel del enlace",
                            invoice_date: Date.new(2026, 6, 1),
                            invoice_number: "FE-LINK-001",
                            identification: "900111222",
                            invoice_value: 100_000.0, invoice_tax: 0.0, invoice_total: 100_000.0)
    end
    refute @gasto.is_acepted, "La prueba no vale si el gasto nacio aceptado"

    @token = ExpenseApprovalToken.generate(@gasto)
  end

  # --- GET: solo pinta -------------------------------------------------------

  test "el enlace del correo muestra el gasto sin iniciar sesion" do
    get expense_approval_path(t: @token)

    assert_response :success
    assert_match "Hotel del enlace", response.body
    assert_match @centro.code, response.body
    assert_match users(:ingeniero).names, response.body
  end

  test "el GET del enlace NO aprueba el gasto" do
    get expense_approval_path(t: @token)

    refute @gasto.reload.is_acepted,
           "Un escaner de correo que visite el enlace estaria aprobando gastos solo"
  end

  test "un token invalido o vencido muestra la pagina de enlace caducado" do
    get expense_approval_path(t: "no-es-un-token")

    assert_response :not_found
    assert_match(/ya no sirve/i, response.body)
  end

  test "sin token tampoco revienta" do
    get expense_approval_path

    assert_response :not_found
  end

  # --- POST: aprueba ---------------------------------------------------------

  test "el boton aprueba el gasto sin sesion" do
    post expense_approval_path, params: { t: @token }

    assert_response :success
    assert @gasto.reload.is_acepted
    assert_match(/aprobado/i, response.body)
  end

  test "aprobar dos veces con el mismo enlace no rompe nada" do
    # El token no se puede revocar ni marcar como usado: no hay donde anotarlo.
    # Lo que lo hace tolerable es esto, que la accion sea idempotente.
    post expense_approval_path, params: { t: @token }
    post expense_approval_path, params: { t: @token }

    assert_response :success
    assert @gasto.reload.is_acepted
    assert_match(/ya estaba aprobado/i, response.body)
  end

  test "un token invalido no aprueba nada" do
    post expense_approval_path, params: { t: "no-es-un-token" }

    assert_response :not_found
    refute @gasto.reload.is_acepted
  end

  test "aprobar deja la auditoria a nombre del propietario del centro" do
    # Sin sesion, `User.current` viene vacio y el registro de edicion quedaria
    # sin autor. El actor es el dueño del centro, que es quien aprueba.
    post expense_approval_path, params: { t: @token }

    assert_equal @dueno.id, @gasto.reload.last_user_edited_id
  end

  test "aprobar reevalua el presupuesto del par" do
    # Aceptar COMPROMETE CUPO (ExpenseBudgetService.consumidores). Sin el
    # reevaluo, el disponible de las pantallas se queda como estaba hasta el
    # proximo guardado de cualquier otro gasto del mismo par: un desfase
    # invisible y dificil de atar a su causa.
    #
    # Se comprueba por el EFECTO y no con un espia. Se deja el gasto en
    # `excedido` con un motivo viejo, que es el caso real de "se amplio la
    # partida despues de registrarlo": hay $500.000 activos y el gasto es de
    # $100.000, asi que un reevaluo tiene que devolverlo a `aprobado` y borrar el
    # motivo. Si el reevaluo no corre, se queda excedido.
    #
    # Tiene que partir de un estado GESTIONADO (aprobado/excedido):
    # `sin_presupuesto` es la marca de historico y el motor lo salta a proposito
    # (MANAGED_STATUSES), asi que no serviria para observar nada.
    partida = expense_budgets(:activa_ingeniero)
    @gasto.update_columns(budget_status: ExpenseBudgetService::STATUS_EXCEDIDO,
                          budget_reason: "Excede el presupuesto disponible en $1",
                          expense_budget_id: partida.id)

    post expense_approval_path, params: { t: @token }

    @gasto.reload
    assert @gasto.is_acepted
    assert_equal ExpenseBudgetService::STATUS_APROBADO, @gasto.budget_status
    assert_nil @gasto.budget_reason
    assert_equal partida.id, @gasto.expense_budget_id
  end

  # `User.current` es estado de hilo y el hilo se reutiliza entre peticiones: si
  # el controller no lo restaura, la siguiente peticion escribe a nombre del
  # dueño del centro de la anterior.
  test "aprobar no deja User.current apuntando al propietario" do
    post expense_approval_path, params: { t: @token }

    assert_nil User.current
  end
end

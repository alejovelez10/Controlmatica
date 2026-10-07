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

  # --- Rechazo desde el mismo enlace (2026-10-06) ---------------------------

  test "el GET ofrece las dos salidas, aprobar y rechazar" do
    get expense_approval_path(t: @token)

    assert_match "Aprobar este gasto", response.body
    assert_match "Rechazar este gasto", response.body
    assert_match "Motivo del rechazo", response.body
  end

  test "el GET del enlace NO rechaza el gasto" do
    # Gemela de la prueba del GET que no aprueba, y mas importante todavia: un
    # rechazo disparado por un antivirus de correo saca el gasto de circulacion
    # y nadie entiende por que.
    get expense_approval_path(t: @token)

    refute @gasto.reload.rechazado?
  end

  test "el POST de rechazo deja el gasto rechazado, con autor y motivo" do
    post expense_rejection_path, params: { t: @token,
                                           rejection_reason: "La factura no es de este centro" }

    assert_response :success
    @gasto.reload
    assert @gasto.rechazado?
    assert_equal "La factura no es de este centro", @gasto.rejection_reason
    assert_equal @dueno.id, @gasto.rejected_by_id, "el rechazo tiene que quedar con autor"
    assert @gasto.rejected_at.present?, "un rechazado sin fecha no se puede auditar"
  end

  test "rechazar sin motivo tambien funciona" do
    # Es opcional a proposito: obligar a redactar para poder frenar un gasto
    # equivocado es peor que un rechazo escueto.
    post expense_rejection_path, params: { t: @token }

    assert @gasto.reload.rechazado?
    assert_nil @gasto.rejection_reason
  end

  test "el rechazo usa el MISMO token que la aprobacion" do
    # Si esto deja de ser cierto, el correo tiene que llevar dos enlaces.
    post expense_rejection_path, params: { t: @token }

    assert @gasto.reload.rechazado?
  end

  test "no se puede rechazar un gasto que ya fue aceptado" do
    # El caso de verdad: alguien lo acepto desde la pantalla de Gastos entre que
    # salio el correo y se abrio el enlace. Rechazar por encima de eso, desde un
    # correo de hace seis dias, seria pisar una decision mas nueva con una mas
    # vieja.
    as_user(users(:admin)) { @gasto.update!(operational_state: ReportExpense::STATE_ACEPTADO) }

    post expense_rejection_path, params: { t: @token, rejection_reason: "tarde" }

    assert @gasto.reload.aceptado?, "el gasto no se pudo cambiar"
    assert_match(/ya estaba aprobado/i, response.body)
  end

  test "rechazar dos veces con el mismo enlace no rompe nada" do
    post expense_rejection_path, params: { t: @token, rejection_reason: "primera" }
    primera_fecha = @gasto.reload.rejected_at

    post expense_rejection_path, params: { t: @token, rejection_reason: "segunda" }

    @gasto.reload
    assert @gasto.rechazado?
    assert_equal "primera", @gasto.rejection_reason, "el segundo intento no debe pisar el motivo"
    assert_equal primera_fecha.to_i, @gasto.rejected_at.to_i
  end

  test "un token invalido no rechaza nada" do
    post expense_rejection_path, params: { t: "basura", rejection_reason: "x" }

    assert_response :not_found
    refute @gasto.reload.rechazado?
  end

end

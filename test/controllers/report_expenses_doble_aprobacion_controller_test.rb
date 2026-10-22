require "test_helper"

# Doble aprobacion por los caminos HTTP (2026-10-18): el desplegable de la tabla,
# el "Aceptar gastos" masivo, la pestaña del segundo aprobador, el enlace del
# correo y el rechazo de Contabilidad.
class ReportExpensesDobleAprobacionControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin   = users(:admin)
    @dueno   = users(:dueno_centro)
    @gerente = users(:gerente)
    @centro  = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0, user_owner_id: @dueno.id)
    ExpenseRule.update_all(active: false)

    as_user(@admin) do
      ExpenseRule.create!(name: "Montos altos", active: true, applies_to_all_roles: true, mandatory: false,
                          check_duplicates: false, max_invoice_value: 100_000, requires_second_approval: true,
                          second_approver_rol: rols(:gerente), user: @admin)
    end
    @gasto = as_user(@admin) do
      ReportExpense.create!(omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro,
                            user_invoice: users(:ingeniero), invoice_name: "Hotel caro",
                            invoice_date: Date.current, invoice_number: "FE-DAC-#{SecureRandom.hex(3)}",
                            identification: "900111222", invoice_value: 150_000, invoice_tax: 0,
                            invoice_total: 150_000)
    end
    assert @gasto.pide_segunda_aprobacion?, "La prueba no vale si el gasto no pide segunda aprobacion"
  end

  def json = JSON.parse(response.body)

  def cambiar_estado(gasto, estado)
    patch "/update_state_report_expense/#{gasto.id}/#{estado}"
  end

  # --- el desplegable de la tabla ---------------------------------------------------

  test "aceptar desde la tabla da la primera firma y lo dice" do
    sign_in_as @admin
    cambiar_estado(@gasto, "aceptado")

    assert_equal "success", json["type"]
    assert_match "Falta la segunda aprobación", json["success"]
    assert @gasto.reload.pendiente_segunda?
    assert_equal @admin.id, @gasto.first_approved_by_id
  end

  test "el segundo aprobador acepta desde la tabla aunque no tenga permiso de aceptar gastos" do
    sign_in_as @admin
    cambiar_estado(@gasto, "aceptado")

    sign_in_as @gerente
    cambiar_estado(@gasto, "aceptado")

    assert_equal "success", json["type"], json.inspect
    assert @gasto.reload.aceptado?
  end

  test "quien no le toca la segunda firma recibe el motivo, no un error mudo" do
    sign_in_as @admin
    cambiar_estado(@gasto, "aceptado")
    cambiar_estado(@gasto, "aceptado")

    assert_equal "error", json["type"]
    assert_match "Usted dio la primera aprobación", json["message"].join
    assert @gasto.reload.pendiente_segunda?
  end

  test "pendiente de segunda aprobacion no se puede pedir por la URL" do
    sign_in_as @admin
    cambiar_estado(@gasto, "pendiente_segunda")

    assert_response :unprocessable_entity
    assert @gasto.reload.creado?
  end

  test "alguien sin relacion con el gasto no puede decidirlo" do
    sign_in_as users(:sin_permisos)
    cambiar_estado(@gasto, "aceptado")

    assert_response :forbidden
  end

  # --- la aceptacion masiva ---------------------------------------------------------

  test "aceptar gastos en masa dice cuantos quedaron esperando la segunda" do
    sign_in_as @admin
    patch update_filter_values_path, params: { scope: "all" }

    assert_match "quedó pendiente de la segunda aprobación", json["success"]
    assert @gasto.reload.pendiente_segunda?
  end

  # --- la pestaña del segundo aprobador ---------------------------------------------

  test "la pestaña de segunda aprobacion muestra lo que espera mi firma, y nada mas" do
    sign_in_as @admin
    cambiar_estado(@gasto, "aceptado")

    sign_in_as @gerente
    get get_report_expenses_path, params: { scope: "second_approval" }
    ids = json["data"].map { |r| r["id"] }
    assert_equal [@gasto.id], ids
    fila = json["data"].first
    assert_match "Cargo:", fila["double_approval"]["approvers"]
    assert_equal @admin.id, fila["double_approval"]["first_by"]["id"]

    sign_in_as users(:ingeniero_dos)
    get get_report_expenses_path, params: { scope: "second_approval" }
    assert_empty json["data"]
  end

  # El dueño del centro que ademas es del cargo aprobador: da la primera firma y
  # la segunda le toca a otro del cargo, no a el.
  test "quien dio la primera firma no ve el gasto en su pestaña de segunda aprobacion" do
    @dueno.update_columns(rol_id: @gerente.rol_id)
    post expense_approval_path, params: { t: ExpenseApprovalToken.generate(@gasto) }
    assert @gasto.reload.pendiente_segunda?
    assert_equal @dueno.id, @gasto.first_approved_by_id

    sign_in_as @dueno
    get get_report_expenses_path, params: { scope: "second_approval" }
    assert_empty json["data"]

    sign_in_as @gerente
    get get_report_expenses_path, params: { scope: "second_approval" }
    assert_equal [@gasto.id], json["data"].map { |r| r["id"] }
  end

  test "los gastos sin doble aprobacion no traen nada nuevo en la fila" do
    sign_in_as @admin
    get get_report_expenses_path, params: { scope: "all" }

    otras = json["data"].reject { |r| r["id"] == @gasto.id }
    assert otras.any?
    assert otras.all? { |r| r["double_approval"].nil? }
  end

  # --- el enlace del correo ---------------------------------------------------------

  test "el enlace del dueño da la primera firma y avisa que falta la segunda" do
    post expense_approval_path, params: { t: ExpenseApprovalToken.generate(@gasto) }

    assert_response :success
    assert_match "segunda aprobación", response.body
    assert @gasto.reload.pendiente_segunda?
    assert_equal @dueno.id, @gasto.first_approved_by_id
  end

  test "el enlace del segundo aprobador da la segunda firma" do
    post expense_approval_path, params: { t: ExpenseApprovalToken.generate(@gasto) }
    token = ExpenseApprovalToken.generate_segunda(@gasto.reload, @gerente)

    get expense_approval_path(t: token)
    assert_match "Dar la segunda aprobación", response.body

    post expense_approval_path, params: { t: token }
    assert @gasto.reload.aceptado?
    assert_equal @gerente.id, @gasto.second_approved_by_id
  end

  test "el enlace del dueño no sirve para la segunda firma" do
    token = ExpenseApprovalToken.generate(@gasto)
    post expense_approval_path, params: { t: token }
    post expense_approval_path, params: { t: token }

    assert @gasto.reload.pendiente_segunda?
    assert_match "espera la segunda", response.body
  end

  test "el segundo aprobador puede rechazar desde su enlace" do
    post expense_approval_path, params: { t: ExpenseApprovalToken.generate(@gasto) }
    token = ExpenseApprovalToken.generate_segunda(@gasto.reload, @gerente)

    post expense_rejection_path, params: { t: token, rejection_reason: "Muy caro" }
    assert @gasto.reload.rechazado?
    assert_equal "Muy caro", @gasto.rejection_reason
  end

  test "un enlace de segunda firma a nombre de quien no le toca no aprueba" do
    post expense_approval_path, params: { t: ExpenseApprovalToken.generate(@gasto) }
    token = ExpenseApprovalToken.generate_segunda(@gasto.reload, users(:ingeniero_dos))

    post expense_approval_path, params: { t: token }
    assert @gasto.reload.pendiente_segunda?
    assert_match "No se pudo aprobar", response.body
  end

  # --- Contabilidad -------------------------------------------------------------------

  test "Contabilidad rechaza un gasto con doble aprobacion y queda Rechazado" do
    sign_in_as @admin
    cambiar_estado(@gasto, "aceptado")
    sign_in_as @gerente
    cambiar_estado(@gasto, "aceptado")
    assert @gasto.reload.aceptado?

    sign_in_as @admin
    patch "/reject_accounting_expense/#{@gasto.id}"

    assert_equal "El gasto fue rechazado y salió de Contabilidad", json["success"]
    @gasto.reload
    assert @gasto.rechazado?
    assert_nil @gasto.second_approved_by_id
  end

  test "Contabilidad sigue rechazando como siempre un gasto de una sola aprobacion" do
    simple = as_user(@admin) do
      ReportExpense.create!(omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro,
                            user_invoice: users(:ingeniero), invoice_name: "Taxi", invoice_date: Date.current,
                            invoice_number: "FE-DAC-S", identification: "900111222",
                            invoice_value: 20_000, invoice_tax: 0, invoice_total: 20_000,
                            operational_state: ReportExpense::STATE_ACEPTADO)
    end
    assert simple.aceptado?

    sign_in_as @admin
    patch "/reject_accounting_expense/#{simple.id}"

    assert_equal "El gasto fue rechazado y salió de Contabilidad", json["success"]
    assert simple.reload.rechazado?
  end
end

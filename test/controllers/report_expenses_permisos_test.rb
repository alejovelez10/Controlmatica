require "test_helper"

# Candados de servidor de Gastos (M1) y los dos permisos de aceptar (M4), de
# las mejoras de octubre (docs/plan-gastos-ia/15).
#
# HASTA M1 ESTOS ENDPOINTS NO VERIFICABAN NINGUN PERMISO: los botones se
# escondian en la pantalla y cualquiera con sesion podia crear, editar,
# eliminar, aceptar o exportar por URL. Por eso cada prueba entra con un usuario
# que NO tiene el permiso y pega directo al endpoint, que es justo lo que la
# pantalla no puede probar.
class ReportExpensesPermisosTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    @dueno = users(:dueno_centro)
    @centro = cost_centers(:centro_con_viaticos) # dueño: dueno_centro
    @uno = report_expenses(:one)                 # centro_con_viaticos, responsable: ingeniero

    # Deuda preexistente del legado: CostCenter#change_state multiplica
    # hour_cotizada * eng_hours sin guarda de nil y revienta al recalcular.
    [@centro, cost_centers(:centro_ajeno)].each { |c| c.update_columns(hour_cotizada: 0.0, eng_hours: 0.0) }
  end

  # Un gasto que no es del ingeniero NI de un centro suyo: el responsable es
  # ingeniero_dos y el centro es de contador.
  def gasto_ajeno(**overrides)
    as_user(@admin) do
      ReportExpense.create!({ user: @admin, cost_center: cost_centers(:centro_ajeno),
                              user_invoice: users(:ingeniero_dos), invoice_name: "Gasto ajeno",
                              invoice_date: Date.new(2026, 6, 1), invoice_number: "FE-AJ-#{SecureRandom.hex(3)}",
                              identification: "900111222", invoice_value: 10_000.0, invoice_tax: 0.0,
                              invoice_total: 10_000.0 }.merge(overrides))
    end
  end

  # Usuario que solo VE: entra al modulo y tiene "Ver todos", nada mas.
  def solo_ver_todos
    rol = rols(:sin_permisos)
    grant_permission!(rol, "Gastos", "Ingreso al modulo")
    grant_permission!(rol, "Gastos", "Ver todos")
    users(:sin_permisos)
  end

  def con_permiso(usuario, *acciones)
    acciones.each { |a| grant_permission!(usuario.rol, "Gastos", a) }
    usuario
  end

  # --- M1: crear, editar, eliminar, exportar -----------------------------------

  test "sin permiso de crear no se crea un gasto" do
    sign_in_as solo_ver_todos

    assert_no_difference -> { ReportExpense.count } do
      post "/report_expenses", params: { cost_center_id: @centro.id, invoice_name: "Por URL",
                                         invoice_date: "2026-06-10", invoice_value: 1_000 }
    end
    assert_json_forbidden
  end

  test "con solo Ver todos se ve todo pero no se edita" do
    # Punto 9 del cliente: "el que tenga ver todo solo no puede hacer eso".
    sign_in_as solo_ver_todos

    get "/get_report_expenses", params: { scope: "all" }
    assert_includes assert_json_list.map { |r| r["id"] }, @uno.id

    patch "/report_expenses/#{@uno.id}", params: { invoice_name: "Editado por URL" }

    assert_json_forbidden
    refute_equal "Editado por URL", @uno.reload.invoice_name
  end

  test "con solo Ver todos no se elimina" do
    sign_in_as solo_ver_todos

    assert_no_difference -> { ReportExpense.count } do
      delete "/report_expenses/#{@uno.id}"
    end
    assert_json_forbidden
  end

  test "con permiso de editar si se edita" do
    # El candado no puede pasarse de largo: el rol ingeniero tiene "Editar".
    sign_in_as @ingeniero

    patch "/report_expenses/#{@uno.id}", params: { invoice_name: "Hotel corregido" }

    assert_equal "success", json_body["type"], response.body
    assert_equal "Hotel corregido", @uno.reload.invoice_name
  end

  test "sin permiso de exportar no se descarga el Excel" do
    sign_in_as solo_ver_todos

    get "/download_file/report_expenses/todos"

    assert_json_forbidden
  end

  # --- M4: "Aceptar gasto" alcanza lo propio y lo de sus centros ----------------

  test "con Aceptar gasto el dueño del centro acepta los gastos de su centro" do
    sign_in_as con_permiso(@dueno, "Aceptar gasto")

    patch "/update_state_report_expense/#{@uno.id}/aceptado"

    assert_response :success
    assert @uno.reload.aceptado?
  end

  test "con Aceptar gasto el responsable acepta los suyos" do
    sign_in_as con_permiso(@ingeniero, "Aceptar gasto")

    patch "/update_state_report_expense/#{@uno.id}/aceptado"

    assert_response :success
    assert @uno.reload.aceptado?
  end

  test "con Aceptar gasto no se acepta ni se rechaza un gasto ajeno" do
    ajeno = gasto_ajeno
    sign_in_as con_permiso(@ingeniero, "Aceptar gasto")

    patch "/update_state_report_expense/#{ajeno.id}/aceptado"
    assert_json_forbidden

    patch "/update_state_report_expense/#{ajeno.id}/rechazado", params: { rejection_reason: "por URL" }
    assert_json_forbidden

    assert ajeno.reload.creado?
  end

  test "con Aceptar todos los gastos se acepta cualquiera" do
    ajeno = gasto_ajeno
    sign_in_as con_permiso(@ingeniero, "Aceptar todos los gastos")

    patch "/update_state_report_expense/#{ajeno.id}/aceptado"

    assert_response :success
    assert ajeno.reload.aceptado?
  end

  test "sin ningun permiso de aceptar no se acepta ni lo propio" do
    # El rol ingeniero no trae "Aceptar gasto": registrar un gasto no da
    # derecho a aprobarselo.
    sign_in_as @ingeniero

    patch "/update_state_report_expense/#{@uno.id}/aceptado"

    assert_json_forbidden
    refute @uno.reload.aceptado?
  end

  # --- M4: la aceptacion masiva ---------------------------------------------------

  test "el masivo con Aceptar gasto solo acepta lo propio y lo de sus centros" do
    # Desde "Todos los gastos" la pestaña le deja VER lo ajeno; aceptarlo no.
    ajeno = gasto_ajeno
    usuario = con_permiso(@ingeniero, "Aceptar gasto", "Ver todos")
    sign_in_as usuario

    patch "/update_filter_values", params: { scope: "all" }

    assert_equal "success", json_body["type"]
    assert @uno.reload.aceptado?, "el gasto propio tenia que quedar aceptado"
    assert ajeno.reload.creado?, "el masivo acepto un gasto que el permiso no alcanza"
  end

  test "el masivo sin permiso de aceptar responde 403" do
    sign_in_as solo_ver_todos

    patch "/update_filter_values", params: { scope: "all" }

    assert_json_forbidden
    refute @uno.reload.aceptado?
  end

  test "el masivo no des-rechaza un gasto rechazado" do
    # Rechazar es una decision explicita: un "Aceptar gastos" sobre un filtro
    # que lo incluya no puede pisarla en silencio.
    rechazado = gasto_ajeno
    as_user(@admin) do
      rechazado.rechazar(actor: @admin, motivo: "No corresponde")
      rechazado.save!
    end
    sign_in_as @admin

    patch "/update_filter_values", params: { scope: "all", cost_center_id: rechazado.cost_center_id }

    assert rechazado.reload.rechazado?
  end

  # --- M4: lo que la pantalla recibe ---------------------------------------------

  test "la pantalla recibe los dos niveles y los centros del dueño" do
    sign_in_as con_permiso(@dueno, "Aceptar gasto")

    get "/report_expenses"

    estados = JSON.parse(css_select("div[data-react-class]").first["data-react-props"])["estados"]
    assert_equal true, estados["closed"]
    assert_equal false, estados["accept_all"]
    assert_includes estados["owned_cost_center_ids"], @centro.id
  end

  test "con Aceptar todos los gastos la pantalla no necesita la lista de centros" do
    sign_in_as con_permiso(@ingeniero, "Aceptar todos los gastos")

    get "/report_expenses"

    estados = JSON.parse(css_select("div[data-react-class]").first["data-react-props"])["estados"]
    assert_equal true, estados["accept_all"]
    assert_equal [], estados["owned_cost_center_ids"]
  end
end

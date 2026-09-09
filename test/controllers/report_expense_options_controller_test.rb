require "test_helper"

# report_expense_options_controller: la tabla de administracion tiene que
# seguir viendo TODAS las opciones (prendidas y apagadas) — es la unica forma
# de volver a prender una que se apago — y el checkbox nuevo tiene que poder
# prender y apagar sin pisar el resto del formulario de edicion.
#
# NO hay test de #index a proposito: hace
# ModuleControl.find_by_name("Tipos de Gastos").id sin guarda de nil, y ese
# modulo no esta en module_controls.yml. Revienta por una razon ajena a este
# cambio.
class ReportExpenseOptionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
  end

  test "sin sesion get_report_expense_options redirige al login" do
    get get_report_expense_options_path

    assert_redirected_to new_user_session_path
  end

  test "get_report_expense_options devuelve la prendida y la apagada, con used_by_ai" do
    sign_in_as(@admin)
    prendida = ReportExpenseOption.create!(name: "Prendida-260909", category: "Tipo",
                                           user_id: @admin.id, used_by_ai: true)
    apagada = ReportExpenseOption.create!(name: "Apagada-260909", category: "Tipo",
                                          user_id: @admin.id, used_by_ai: false)

    get get_report_expense_options_path, params: { search: "260909", per_page: 100 }

    cuerpo = JSON.parse(response.body)
    ids = cuerpo["data"].map { |f| f["id"] }
    assert_includes ids, prendida.id
    assert_includes ids, apagada.id

    fila_apagada = cuerpo["data"].find { |f| f["id"] == apagada.id }
    assert_equal false, fila_apagada["used_by_ai"]
    fila_prendida = cuerpo["data"].find { |f| f["id"] == prendida.id }
    assert_equal true, fila_prendida["used_by_ai"]
  end

  test "PATCH con used_by_ai false apaga la opcion" do
    sign_in_as(@admin)
    opcion = ReportExpenseOption.create!(name: "ParaApagar-260909", category: "Tipo",
                                         user_id: @admin.id, used_by_ai: true)

    patch report_expense_option_path(opcion), params: { used_by_ai: false }, as: :json

    assert_equal false, opcion.reload.used_by_ai
  end

  test "PATCH con used_by_ai true vuelve a prender la opcion" do
    sign_in_as(@admin)
    opcion = ReportExpenseOption.create!(name: "ParaPrender-260909", category: "Tipo",
                                         user_id: @admin.id, used_by_ai: false)

    patch report_expense_option_path(opcion), params: { used_by_ai: true }, as: :json

    assert_equal true, opcion.reload.used_by_ai
  end

  test "PATCH de solo name no pisa used_by_ai" do
    sign_in_as(@admin)
    opcion = ReportExpenseOption.create!(name: "NombreViejo-260909", category: "Tipo",
                                         user_id: @admin.id, used_by_ai: false)

    patch report_expense_option_path(opcion), params: { name: "NombreNuevo-260909" }, as: :json

    opcion.reload
    assert_equal "NombreNuevo-260909", opcion.name
    assert_equal false, opcion.used_by_ai
  end
end

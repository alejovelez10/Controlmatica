require "test_helper"

# Superficie Ruby que crea el paquete 09 para la pantalla de Contabilidad: la
# plantilla HTML y el contrato de props que recibe el pack de React.
#
# ALCANCE HONESTO: Minitest no ejecuta React. Aqui NO se prueba la tabla, ni la
# seleccion multiple, ni los filtros; se prueba que la vista monte el pack
# correcto y que las props lleguen con la forma que el pack asume. El
# comportamiento de cliente lo cubre la suite E2E del paquete 12.
#
# Los gates del controller (403 / redirect) son del paquete 06 y estan probados
# en accounting_expenses_controller_test.rb; aqui se repiten SOLO los dos que
# deciden si esta vista llega a renderizarse.
class AccountingExpensesViewTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @contador = users(:contador)
    @admin = users(:admin)
  end

  # Extrae y parsea las props que webpacker-react serializa en el div de montaje.
  def react_props
    nodo = css_select("div[data-react-class]").first
    assert_not_nil nodo, "No se encontro el div de montaje de React en la respuesta"
    JSON.parse(nodo["data-react-props"])
  end

  test "sin sesion redirige a login" do
    get accounting_expenses_path

    assert_redirected_to new_user_session_path
  end

  test "usuario con permiso Contabilidad ve la pantalla" do
    sign_in @contador

    get accounting_expenses_path

    assert_response :success
    assert_select "div[data-react-class=?]", "AccountingExpenseIndex"
  end

  test "la vista monta el pack correcto" do
    sign_in @contador

    get accounting_expenses_path

    assert_match "AccountingExpenseIndex", response.body
    # Regresion: copiar report_expenses/index.html.erb y olvidar cambiar el
    # nombre del pack deja la pantalla montando el modulo de Gastos, que
    # renderiza sin error de servidor y con los datos equivocados.
    assert_no_match(/ReportExpenseIndex/, response.body)
  end

  test "usuario sin permiso Contabilidad no entra" do
    sign_in users(:ingeniero_sin_permisos)

    get accounting_expenses_path

    assert_redirected_to root_path
  end

  test "admin entra aunque el rol no tenga el permiso explicito" do
    # El rol "Administrador" no tiene accion_modules asignados a proposito
    # (fixture del paquete 01): entra por `is_admin?`, no por permisos.
    sign_in @admin

    get accounting_expenses_path

    assert_response :success
    assert_select "div[data-react-class=?]", "AccountingExpenseIndex"
  end

  test "las props incluyen estados y currencies" do
    sign_in @contador

    get accounting_expenses_path

    props = react_props
    assert props["estados"].key?("approve"), "Falta estados.approve en las props"
    assert props["estados"].key?("export"), "Falta estados.export en las props"
    assert props["estados"].key?("show_all"), "Falta estados.show_all en las props"
    assert_kind_of Array, props["currencies"]
    assert props["currencies"].any?, "El catalogo de monedas llego vacio"
  end

  test "currencies trae label y value" do
    sign_in @contador

    get accounting_expenses_path

    # Es la forma que exige react-select. Si get_currencies devolviera
    # ["COP", "USD"] el filtro de moneda quedaria mudo sin lanzar ningun error.
    assert_equal %w[label value], react_props["currencies"].first.keys.sort
  end

  test "props no filtra estados cuando estados es nil" do
    sign_in @contador

    get accounting_expenses_path

    # Con `estados` en null, `this.props.estados.approve` lanza TypeError en el
    # navegador y la pagina queda EN BLANCO: sin error de servidor, sin log y
    # con un warning cripitco en la consola del cliente.
    assert_not_nil react_props["estados"]
  end

  test "las props traen el catalogo de responsables y las opciones de gasto" do
    sign_in @contador

    get accounting_expenses_path

    props = react_props
    assert_kind_of Array, props["users"]
    assert props["users"].any?, "El catalogo de responsables llego vacio"
    assert_kind_of Array, props["report_expense_options"]
  end

  test "el contador ve los tres estados en true" do
    sign_in @contador

    get accounting_expenses_path

    props = react_props
    assert_equal [true, true, true],
                 props["estados"].values_at("approve", "export", "show_all"),
                 "El rol contador debe poder aprobar, exportar y ver todos"
  end
end

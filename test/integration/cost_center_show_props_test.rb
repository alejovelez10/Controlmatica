require "test_helper"

# Contrato VISTA -> REACT del detalle del centro de costos.
#
# Los tres componentes nuevos del paquete 08 (`BudgetsTable`,
# `BudgetSummaryBoard`, `BudgetFormCreate`) no piden nada al servidor para
# arrancar: dependen de las props que `cost_centers/show.html.erb` serializa en
# `data-react-props`. Si una prop deja de llegar, el componente no falla: se
# pinta vacio, que es peor.
class CostCenterShowPropsTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)
  end

  def react_props
    nodo = response.body[/data-react-props="([^"]*)"/, 1]
    assert nodo, "La vista no renderizo ningun data-react-props"
    JSON.parse(CGI.unescapeHTML(nodo))
  end

  test "la vista entrega users_select con todos los usuarios" do
    sign_in_as @admin
    get cost_center_path(@centro)
    assert_response :success

    users_select = react_props["users_select"]
    assert_kind_of Array, users_select, "users_select no llego a React"

    # ESTA es la razon de ser de la prop. `users` sale de `get_users_json`, que
    # filtra `rols.name = "Administrador" OR "Comercial"`
    # (application_helper.rb:190). El beneficiario tipico de una partida es un
    # ingeniero: con esa lista el select de BudgetFormCreate saldria incompleto y
    # nadie lo notaria hasta produccion.
    assert_equal User.count, users_select.size,
                 "users_select debe traer a TODOS los usuarios, no solo Administrador/Comercial"
    assert_operator react_props["users"].size, :<, users_select.size,
                    "Si `users` ya trae a todos, la prop users_select dejo de ser necesaria: revisar get_users_json"

    users_select.each do |u|
      assert_equal %w[label value].sort, u.keys.sort,
                   "react-select espera exactamente {value, label}; llego #{u.keys.inspect}"
    end
  end

  test "la vista entrega el catalogo de monedas" do
    sign_in_as @admin
    get cost_center_path(@centro)
    assert_response :success

    # 🔴 La prop `currencies` quedo DEROGADA por el cierre de la reauditoria: la
    # fuente unica del catalogo es `window.CM_CURRENCIES`, que el paquete 05
    # declara en `layouts/user.html.erb`. El motivo es concreto: el modal del
    # indice de Gastos (`renderModal()`) no recibe props, y con el mecanismo
    # anterior se quedaba sin catalogo. Por eso el contrato se verifica sobre el
    # global, que es lo que los dos formularios leen de verdad.
    assert_nil react_props["currencies"],
               "La prop `currencies` esta derogada: el catalogo va por window.CM_CURRENCIES"

    json = response.body[/window\.CM_CURRENCIES\s*=\s*(\[.*?\]);/m, 1]
    assert json, "El layout no publico window.CM_CURRENCIES"

    catalogo = JSON.parse(json)
    assert_equal Currency::CODES.size, catalogo.size
    assert_equal({ "value" => "COP", "label" => "COP — Peso colombiano" }, catalogo.first,
                 "COP debe ir primero: es el default del formulario y del fallback del cliente")
  end

  test "la vista entrega estados con las claves de presupuesto" do
    sign_in_as @admin
    get cost_center_path(@centro)
    assert_response :success

    estados = react_props["estados"]
    %w[budget_module budget_create budget_edit budget_delete budget_show_all
       is_center_owner expense_create expense_edit expense_delete
       expense_show_all].each do |clave|
      assert_includes estados.keys, clave
      assert_includes [true, false], estados[clave],
                      "#{clave} debe llegar como booleano; llego #{estados[clave].inspect}"
    end
  end

  test "usuario sin permiso de Presupuesto recibe budget_module false" do
    sign_in_as users(:ingeniero)
    get cost_center_path(@centro)
    assert_response :success

    refute react_props["estados"]["budget_module"],
           "Sin 'Presupuesto / Ingreso al modulo' la pestana no debe ni existir"
  end
end

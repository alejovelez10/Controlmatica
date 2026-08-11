require "test_helper"

# Item de menu "Reglas de gastos" dentro del treeview "Configuración"
# (layouts/user.html.erb, paquete 14, tarea 6).
#
# POR QUE ESTO SE PRUEBA Y NO SE DA POR HECHO: el layout es el de TODAS las
# pantallas. Un error ahi no rompe una pagina, rompe el sistema entero; y un
# item de menu que no aparece es indistinguible de un permiso mal configurado,
# asi que nadie lo reporta como bug: se reporta como "no tengo permiso".
class ExpenseRulesMenuTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    # Rol propio con SOLO el modulo "Reglas de gastos": es el caso que de
    # verdad ejercita la condicion nueva de `authorization_config`. Con un rol
    # que ademas tuviera "Usuarios" o "Clientes", el treeview de Configuración
    # se abriria por ellos y el test pasaria aunque la condicion no existiera.
    @rol_reglas = Rol.create!(name: "Solo reglas de gastos", description: "Unicamente el modulo de reglas")
    @usuario_reglas = users(:ingeniero_sin_permisos)
    @usuario_reglas.update_columns(rol_id: @rol_reglas.id)
    grant_permission!(@rol_reglas, "Reglas de gastos", "Ingreso al modulo")
  end

  test "el menu muestra Reglas de gastos con permiso" do
    sign_in @usuario_reglas

    get expense_rules_path

    assert_response :success
    assert_select "a[href=?]", "/expense_rules", 1
    assert_select "a[data-testid=?]", "nav-reglas-gastos", 1
  end

  test "el menu oculta Reglas de gastos sin permiso" do
    sign_in users(:sin_permisos)

    get root_path

    assert_response :success
    assert_select "a[href=?]", "/expense_rules", 0
  end

  test "el admin ve Reglas de gastos en el menu" do
    # Entra por `current_user.rol.name == "Administrador"`, no por permisos: el
    # rol administrador no tiene accion_modules asignados (fixture del 01).
    sign_in users(:admin)

    get expense_rules_path

    assert_response :success
    assert_select "a[href=?]", "/expense_rules", 1
  end

  test "el treeview de configuracion queda expandido en Reglas de gastos" do
    sign_in users(:admin)

    get expense_rules_path

    assert_response :success
    # Sin `expense_rules` en `config_controllers`, el treeview se renderiza
    # cerrado y el usuario que acaba de entrar a la pantalla no ve marcado
    # donde esta.
    assert_select "li.treeview.is-expanded"
    assert_select "a.app-menu__item.active[href=?]", "/expense_rules", 1
  end

  test "el treeview de configuracion aparece para un rol que SOLO tiene Reglas de gastos" do
    # LA REGRESION QUE ESTE ARCHIVO EXISTE PARA EVITAR: el treeview entero
    # cuelga de `authorization_config`. Si "Reglas de gastos" no se hubiera
    # sumado a esa condicion, este usuario tendria el permiso, el controller lo
    # dejaria entrar y aun asi su unica pantalla seria inalcanzable desde el
    # menu.
    sign_in @usuario_reglas

    get expense_rules_path

    assert_response :success
    assert_select "span.app-menu__label", text: "Configuración", count: 1
    assert_select "a[href=?]", "/expense_rules", 1
    # Y no se le cuelan los items de los modulos que NO tiene.
    assert_select "a[href=?]", "/users", 0
    assert_select "a[href=?]", "/customers", 0
  end

  test "el menu sigue mostrando los items viejos de Configuracion" do
    # Regresion de la edicion de `config_controllers` y del bloque nuevo:
    # agregar un `<% end %>` de mas o de menos dejaria el treeview entero fuera
    # y con el todos los items que ya existian.
    sign_in users(:admin)

    get expense_rules_path

    assert_response :success
    assert_select "a[href=?]", "/providers", 1
    assert_select "a[href=?]", "/customers", 1
    assert_select "a[href=?]", "/parameterizations", 1
    assert_select "a[href=?]", "/users", 1
    assert_select "a[href=?]", "/rols", 1
    assert_select "a[href=?]", "/module_controls", 1
  end

  test "el item de Reglas de gastos apunta a la ruta del index y no a una accion JSON" do
    sign_in users(:admin)

    get root_path

    assert_response :success
    # `/get_expense_rules` es el endpoint de datos: si el link apuntara ahi, el
    # usuario veria un JSON crudo en el navegador.
    assert_select "a[href=?]", "/expense_rules", 1
    assert_select "a[href=?]", "/get_expense_rules", 0
  end
end

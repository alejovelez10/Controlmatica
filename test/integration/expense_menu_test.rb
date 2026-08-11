require "test_helper"

# Item de menu "Contabilidad" dentro del treeview "Control de gastos"
# (layouts/user.html.erb, paquete 09).
#
# POR QUE ESTO SE PRUEBA Y NO SE DA POR HECHO: el layout es el de TODAS las
# pantallas. Un error ahi no rompe una pagina, rompe el sistema entero; y un
# item de menu que no aparece es indistinguible de un permiso mal configurado.
class ExpenseMenuTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  test "el menu muestra Contabilidad con permiso" do
    sign_in users(:contador)

    get report_expenses_path

    assert_response :success
    assert_select "a[href=?]", "/accounting_expenses", 1
    assert_select "a[data-testid=?]", "nav-contabilidad", 1
  end

  test "el menu oculta Contabilidad sin permiso" do
    sign_in users(:ingeniero_sin_permisos)

    get root_path

    assert_response :success
    assert_select "a[href=?]", "/accounting_expenses", 0
  end

  test "el admin ve Contabilidad en el menu" do
    # Entra por `current_user.rol.name == "Administrador"`, no por permisos: el
    # rol administrador no tiene accion_modules asignados.
    sign_in users(:admin)

    get report_expenses_path

    assert_response :success
    assert_select "a[href=?]", "/accounting_expenses", 1
  end

  test "el treeview de gastos queda expandido en Contabilidad" do
    sign_in users(:contador)

    get accounting_expenses_path

    assert_response :success
    # Sin `accounting_expenses` en `expense_controllers`, el treeview se
    # renderiza cerrado y el usuario que acaba de entrar a la pantalla no ve
    # marcado donde esta.
    assert_select "li.treeview.is-expanded"
    assert_select "a.app-menu__item.active[href=?]", "/accounting_expenses", 1
  end

  test "el menu sigue mostrando Gastos y Relacion de gastos" do
    # Regresion de la edicion de la condicion de apertura del treeview: agregar
    # un `||` de mas o cambiar el operador dejaria el bloque entero fuera y con
    # el los dos items que ya existian.
    #
    # Se usa el admin y no el gerente porque el modulo "Relación de gastos" no
    # existe en module_controls.yml (fixtures del paquete 01): ningun rol lo
    # tiene por permiso, y el unico camino por el que ese item se renderiza es
    # la rama `rol.name == "Administrador"`, que es justamente la que la
    # edicion de este paquete podria haber roto.
    sign_in users(:admin)

    get report_expenses_path

    assert_response :success
    assert_select "a[href=?]", "/report_expenses", 1
    assert_select "a[href=?]", "/expense_ratios", 1
    assert_select "a[href=?]", "/accounting_expenses", 1
  end

  test "el treeview de gastos aparece para un rol que SOLO tiene Contabilidad" do
    # El contador no tiene el modulo "Gastos". Antes de este paquete la
    # condicion de apertura no lo contemplaba, asi que el treeview completo
    # quedaba oculto y su unica pantalla era inalcanzable desde el menu.
    sign_in users(:contador)

    get accounting_expenses_path

    assert_response :success
    assert_select "a[href=?]", "/accounting_expenses", 1
    assert_select "a[href=?]", "/report_expenses", 0
  end
end

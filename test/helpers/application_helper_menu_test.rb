require "test_helper"

# Los dos metodos de ApplicationHelper que crea el paquete 09:
# `authorization_accounting_expenses` y el branch de `controller_name_helper`
# para la pantalla de Contabilidad.
#
# El archivo esta REPARTIDO POR METODO entre varios paquetes (§7.2), asi que
# estas pruebas cubren solo los propios y una regresion del branch vecino: el
# `elsif` nuevo se inserta en medio de una cadena de treinta ramas y romper la
# de Gastos al insertarlo no daria ningun error, solo un titulo equivocado.
class ApplicationHelperMenuTest < ActionView::TestCase
  tests ApplicationHelper

  # `has_menu_permission?` cuelga de `current_user`, que en una vista lo aporta
  # Devise. Aqui se inyecta a mano y se invalida la memoizacion, porque
  # `menu_permissions` cachea en @_menu_permissions y sin limpiarla el segundo
  # usuario de un mismo test veria los permisos del primero.
  def con_usuario(user)
    @usuario_actual = user
    @_menu_permissions = nil
    yield
  end

  def current_user
    @usuario_actual
  end

  # --- controller_name_helper -----------------------------------------------

  test "controller_name_helper devuelve el titulo de Contabilidad" do
    card = controller_name_helper("accounting_expenses", "index")

    assert_includes card, "Contabilidad"
    # Sin el branch nuevo, la cadena cae al `else` final y el encabezado de la
    # pantalla dice literalmente "Proyectos".
    assert_not_includes card, "Proyectos"
  end

  test "controller_name_helper de Gastos no cambio" do
    assert_includes controller_name_helper("report_expenses", "index"), "Control de gastos"
  end

  test "controller_name_helper de un controller desconocido sigue cayendo al else" do
    assert_equal "Proyectos", controller_name_helper("no_existe", "index")
  end

  # --- authorization_accounting_expenses ------------------------------------

  test "authorization_accounting_expenses true con el permiso" do
    con_usuario(users(:contador)) do
      assert authorization_accounting_expenses,
             "El rol contador tiene el modulo Contabilidad con Ingreso al modulo"
    end
  end

  test "authorization_accounting_expenses false sin el permiso" do
    con_usuario(users(:sin_permisos)) do
      # OJO: `has_menu_permission?` devuelve nil, no false, cuando el modulo no
      # esta en el hash. Por eso `assert_not` y no `assert_equal false`.
      assert_not authorization_accounting_expenses
    end
  end

  test "authorization_accounting_expenses false si tiene el modulo sin la accion de ingreso" do
    rol = rols(:sin_permisos)
    grant_permission!(rol, "Contabilidad", "Exportar a excel")

    con_usuario(users(:sin_permisos)) do
      # Tener el modulo NO alcanza: el helper pregunta por la accion
      # "Ingreso al modulo", que es la que abre la pantalla.
      assert_not authorization_accounting_expenses
    end
  end

  test "authorization_accounting_expenses true para el rol admin solo si tiene el permiso" do
    # El rol Administrador entra por `is_admin?` en el controller, no por este
    # helper: la fixture no le asigna accion_modules. Se afirma explicitamente
    # para que nadie "arregle" el helper agregandole un caso especial de admin,
    # que es la comprobacion que hace el layout aparte.
    con_usuario(users(:admin)) do
      assert_not authorization_accounting_expenses
    end
  end
end

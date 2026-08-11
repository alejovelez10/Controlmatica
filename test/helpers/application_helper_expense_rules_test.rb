require "test_helper"

# Los dos aportes del paquete 14 a ApplicationHelper: el metodo
# `authorization_expense_rules` y el branch de `controller_name_helper` para la
# pantalla de Reglas de gastos, mas la condicion que se le agrego a
# `authorization_config`.
#
# ARCHIVO APARTE y no dentro de application_helper_menu_test.rb: ese es del
# paquete 09 y el helper esta REPARTIDO POR METODO entre varios paquetes
# (§7.2). Cada uno prueba lo suyo.
class ApplicationHelperExpenseRulesTest < ActionView::TestCase
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

  test "controller_name_helper devuelve el titulo de Reglas de gastos" do
    card = controller_name_helper("expense_rules", "index")

    assert_includes card, "Reglas de gastos"
    # Sin el branch nuevo, la cadena cae al `else` final y el encabezado de la
    # pantalla dice literalmente "Proyectos".
    assert_not_includes card, "Proyectos"
  end

  test "controller_name_helper de Contabilidad no cambio" do
    # El `elsif` nuevo se inserto justo despues del de Contabilidad, en medio de
    # una cadena de treinta ramas: romper la vecina al insertarlo no daria
    # ningun error, solo un titulo equivocado.
    assert_includes controller_name_helper("accounting_expenses", "index"), "Contabilidad"
  end

  test "controller_name_helper de Turnos no cambio" do
    assert_includes controller_name_helper("shifts", "index"), "Turnos"
  end

  test "controller_name_helper de un controller desconocido sigue cayendo al else" do
    assert_equal "Proyectos", controller_name_helper("no_existe", "index")
  end

  # --- authorization_expense_rules ------------------------------------------

  test "authorization_expense_rules true con el permiso" do
    rol = rols(:sin_permisos)
    grant_permission!(rol, "Reglas de gastos", "Ingreso al modulo")

    con_usuario(users(:sin_permisos)) do
      assert authorization_expense_rules,
             "Con el modulo y la accion de ingreso, el item de menu debe verse"
    end
  end

  test "authorization_expense_rules false sin el permiso" do
    con_usuario(users(:sin_permisos)) do
      # OJO: `has_menu_permission?` devuelve nil, no false, cuando el modulo no
      # esta en el hash. Por eso `assert_not` y no `assert_equal false`.
      assert_not authorization_expense_rules
    end
  end

  test "authorization_expense_rules false si tiene el modulo sin la accion de ingreso" do
    rol = rols(:sin_permisos)
    grant_permission!(rol, "Reglas de gastos", "Crear")

    con_usuario(users(:sin_permisos)) do
      # Tener el modulo NO alcanza: el helper pregunta por la accion
      # "Ingreso al modulo", que es la que abre la pantalla.
      assert_not authorization_expense_rules
    end
  end

  test "authorization_expense_rules es falso para el rol admin, que entra por otra via" do
    # El rol Administrador no tiene accion_modules asignados (fixture del 01):
    # entra por `is_admin?` en el controller y por la comprobacion explicita de
    # `rol.name` en el layout. Se afirma para que nadie "arregle" el helper
    # metiendole un caso especial de admin y duplique la regla en dos sitios.
    con_usuario(users(:admin)) do
      assert_not authorization_expense_rules
    end
  end

  # --- authorization_config --------------------------------------------------

  test "authorization_config es verdadero con solo el permiso de Reglas de gastos" do
    # El treeview de Configuración entero cuelga de este metodo. Sin esta
    # condicion, un rol cuyo unico permiso de configuracion fuera este no veria
    # el menu y su pantalla quedaria inalcanzable.
    rol = rols(:sin_permisos)
    grant_permission!(rol, "Reglas de gastos", "Ingreso al modulo")

    con_usuario(users(:sin_permisos)) do
      assert authorization_config
    end
  end

  test "authorization_config sigue siendo falso para un rol sin ningun permiso" do
    # Regresion del `||` agregado: si en vez de encadenar una condicion se
    # hubiera dejado algo siempre verdadero, el treeview se le abriria a todo el
    # mundo y este test es el unico que lo notaria.
    con_usuario(users(:sin_permisos)) do
      assert_not authorization_config
    end
  end

  test "authorization_config sigue siendo verdadero por los modulos viejos" do
    # "Clientes" NO esta en module_controls.yml (fixtures del paquete 01, dueno
    # unico): se crea aqui en caliente en vez de agregar la etiqueta al archivo
    # ajeno. Es uno de los siete modulos que ya abrian el treeview antes de este
    # paquete, y la condicion nueva no puede haberlos desplazado.
    ModuleControl.create!(name: "Clientes", description: "Gestion de clientes", user_id: users(:admin).id)
    rol = rols(:sin_permisos)
    grant_permission!(rol, "Clientes", "Ingreso al modulo")

    con_usuario(users(:sin_permisos)) do
      assert authorization_config
    end
  end
end

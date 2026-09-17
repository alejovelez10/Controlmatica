require "test_helper"

# Item "Documentación" del treeview "Configuración" (layouts/user.html.erb).
#
# Lo delicado no es el item: es que, para que un usuario SIN permisos lo vea,
# el treeview de Configuración ahora se pinta para todos. Estas pruebas cuidan
# que eso no destape los demas items de Configuración.
class DocumentationMenuTest < ActionDispatch::IntegrationTest
  test "un usuario sin permisos ve Documentación y nada mas de Configuración" do
    sign_in users(:sin_permisos)

    get root_path

    assert_response :success
    assert_select "span.app-menu__label", text: "Configuración", count: 1
    assert_select "a[data-testid=?][href=?]", "nav-documentacion", "/documentation_modules", 1
    %w[/providers /customers /parameterizations /users /rols /module_controls /alerts /expense_rules].each do |ruta|
      assert_select "a[href=?]", ruta, 0, "#{ruta} no deberia verse sin permiso"
    end
  end

  test "el administrador ve Documentación junto a los demas items" do
    sign_in users(:admin)

    get root_path

    assert_select "a[data-testid=?]", "nav-documentacion", 1
    assert_select "a[href=?]", "/providers", 1
  end

  test "el treeview de Configuración queda expandido en Documentación" do
    sign_in users(:sin_permisos)

    get documentation_modules_path

    assert_select "li.treeview.is-expanded a.app-menu__item.active[data-testid=?]", "nav-documentacion", 1
  end
end

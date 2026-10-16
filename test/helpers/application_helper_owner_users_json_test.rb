require "test_helper"

# `get_owner_users_json` es la lista del select de PROPIETARIO del centro de
# costos. La decide la casilla "Puede ser propietario" del rol, no el nombre del
# rol. Ser propietario da permisos reales —administra las partidas de su centro
# y recibe el correo de aprobacion de gastos—, asi que quien entra y quien no es
# una regla de negocio.
class ApplicationHelperOwnerUsersJsonTest < ActionView::TestCase
  tests ApplicationHelper

  setup do
    @accion = AccionModule.create!(name: CostCenter::ACCION_PUEDE_SER_PROPIETARIO,
                                   module_control: module_controls(:centro_costos),
                                   user: users(:admin))
  end

  def crear_usuario(nombre, rol)
    User.create!(names: nombre, last_names: "Prueba", rol: rol,
                 email: "#{nombre.parameterize}@controlmatica.test",
                 password: "password123", password_confirmation: "password123")
  end

  def rol_con_casilla(nombre)
    Rol.create!(name: nombre).tap { |rol| rol.accion_modules << @accion }
  end

  def nombres
    get_owner_users_json.map { |u| u[:name] }
  end

  def test_entra_quien_tiene_la_casilla_en_su_rol
    crear_usuario("Zulma Ingeniera", rol_con_casilla("Ingeniero de proyectos"))

    assert_includes nombres, "Zulma Ingeniera"
  end

  def test_no_entra_quien_no_la_tiene_aunque_su_rol_se_llame_administrador
    # Antes entraba por el NOMBRE del rol. Ahora el nombre no cuenta, y el
    # administrador no tiene bypass: ser propietario es un papel, no un acceso.
    crear_usuario("Yamile Comercial", Rol.create!(name: "Comercial"))

    assert_not_includes nombres, users(:admin).names
    assert_not_includes nombres, "Yamile Comercial"
  end

  def test_una_accion_con_el_mismo_nombre_en_otro_modulo_no_cuenta
    otra = AccionModule.create!(name: CostCenter::ACCION_PUEDE_SER_PROPIETARIO,
                                module_control: module_controls(:gastos), user: users(:admin))
    rol = Rol.create!(name: "Rol con la casilla equivocada")
    rol.accion_modules << otra
    crear_usuario("Walter Equivocado", rol)

    assert_not_includes nombres, "Walter Equivocado"
  end

  def test_cada_usuario_sale_una_sola_vez
    # El join pasa por la tabla HABTM: sin `distinct`, un rol con permisos
    # repetidos duplicaria a sus usuarios en el select.
    rol = rol_con_casilla("Gerente de proyectos")
    rol.accion_modules << accion_modules(:centro_ingreso)
    crear_usuario("Vera Gerente", rol)

    assert_equal 1, nombres.count("Vera Gerente")
  end

  def test_viene_ordenada_por_nombre_y_con_la_forma_id_name
    rol = rol_con_casilla("Comercial con casilla")
    crear_usuario("Zoe Comercial", rol)
    crear_usuario("Aaron Comercial", rol)

    assert_equal nombres.sort, nombres
    # ConstCenter/indexTable.jsx y show.jsx leen `item.name` e `item.id`.
    assert_equal %i[id name], get_owner_users_json.first.keys.sort
  end
end

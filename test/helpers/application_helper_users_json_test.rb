require "test_helper"

# `get_users_json` es la lista de PROPIETARIOS del centro de costos (y de paso
# la de los selects de usuario de esa pantalla). Ser propietario da permisos
# reales —administra las partidas de su centro sin "Ver todos" y recibe el
# correo de aprobacion de gastos—, asi que quien entra y quien no es una regla
# de negocio y no un detalle del helper.
class ApplicationHelperUsersJsonTest < ActionView::TestCase
  tests ApplicationHelper

  def crear_usuario(nombre, rol_nombre)
    rol = Rol.find_or_create_by!(name: rol_nombre)
    User.create!(names: nombre, last_names: "Prueba", rol: rol,
                 email: "#{nombre.parameterize}@controlmatica.test",
                 password: "password123", password_confirmation: "password123")
  end

  def nombres
    get_users_json.map { |u| u[:name] }
  end

  def test_incluye_administrador_comercial_y_administracion
    crear_usuario("Zulma Comercial", "Comercial")
    crear_usuario("Yamile Administracion", "Administracion")

    # El admin de las fixtures (rol "Administrador") entra por su propio rol.
    assert_includes nombres, users(:admin).names
    assert_includes nombres, "Zulma Comercial"
    assert_includes nombres, "Yamile Administracion"
  end

  def test_el_nombre_del_rol_se_compara_sin_mayusculas_ni_tilde
    # `db/seeds_staging.rb:148` siembra los roles en MAYUSCULAS y la version
    # anterior comparaba literal: esa base devolvia una lista vacia y el
    # formulario se quedaba sin propietarios que ofrecer.
    crear_usuario("Walter Mayusculas", "ADMINISTRADOR")
    crear_usuario("Vera Tilde", "Administración")

    assert_includes nombres, "Walter Mayusculas"
    assert_includes nombres, "Vera Tilde"
  end

  def test_excluye_los_demas_roles_y_a_quien_no_tiene_rol
    sin_rol = crear_usuario("Ursula Sin Rol", "Ingeniero")
    sin_rol.update_columns(rol_id: nil)

    # El ingeniero de las fixtures NO es propietario posible: el select del
    # formulario no debe ofrecerlo.
    assert_not_includes nombres, users(:ingeniero).names
    # `joins(:rol)` es INNER JOIN: sin rol no hay fila.
    assert_not_includes nombres, "Ursula Sin Rol"
  end

  def test_viene_ordenada_por_nombre
    crear_usuario("Aaron Comercial", "Comercial")
    crear_usuario("Zoe Comercial", "Comercial")

    assert_equal nombres.sort, nombres
  end

  def test_la_forma_es_id_y_name
    # ConstCenter/indexTable.jsx:136 y show.jsx:165 leen `item.name` e
    # `item.id`. Cambiar las claves deja los selects en blanco sin ningun error.
    assert_equal %i[id name].sort, get_users_json.first.keys.sort
  end
end

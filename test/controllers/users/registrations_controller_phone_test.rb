require 'test_helper'

# Superficie HTTP del telefono de usuario: creacion, edicion, listado y
# strong params. El modal de React manda `phone` en un FormData; si el
# parametro deja de estar permitido el guardado falla en silencio (Rails
# descarta la clave y responde 200), asi que estos tests miran la BD, no la
# respuesta.
class Users::RegistrationsControllerPhoneTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as(users(:admin))
  end

  test "update_user persiste el telefono y su llave normalizada" do
    user = users(:ingeniero)

    patch update_user_path(user.id), params: { names: user.names, email: user.email, phone: "+57 (300) 123-4567" }

    assert_response :success
    assert_equal true, json_body["success"]

    user.reload
    assert_equal "+57 (300) 123-4567", user.phone
    assert_equal "3001234567", user.phone_normalized
  end

  test "update_user con contrasena tambien persiste el telefono" do
    user = users(:ingeniero)
    nueva = "otraClave456"

    patch update_user_path(user.id), params: {
      names: user.names, email: user.email, phone: "3059998877",
      password: nueva, password_confirmation: nueva
    }

    assert_response :success
    assert_equal "3059998877", user.reload.phone_normalized
  end

  test "update_user permite borrar el telefono" do
    user = users(:ingeniero)
    as_user(users(:admin)) { user.update!(phone: "+57 300 123 4567") }

    patch update_user_path(user.id), params: { names: user.names, email: user.email, phone: "" }

    assert_response :success
    user.reload
    assert_equal "", user.phone
    assert_nil user.phone_normalized
  end

  test "update_user ignora los parametros no permitidos" do
    user = users(:ingeniero)
    conteo_previo = user.sign_in_count

    patch update_user_path(user.id), params: {
      names: user.names, email: user.email, phone: "3001234567",
      sign_in_count: 999, menu: "nav-md-hackeado"
    }

    assert_response :success
    user.reload
    # El permitido entra...
    assert_equal "3001234567", user.phone
    # ...y los que no estan en la lista blanca no se cuelan.
    assert_equal conteo_previo, user.sign_in_count
    assert_not_equal "nav-md-hackeado", user.menu
  end

  test "create_user guarda el telefono del usuario nuevo" do
    assert_difference "User.count", 1 do
      post create_user_path, params: {
        names: "Nueva Persona",
        email: "nueva_persona@controlmatica.test",
        password: AuthenticationHelpers::FIXTURE_PASSWORD,
        password_confirmation: AuthenticationHelpers::FIXTURE_PASSWORD,
        rol_id: rols(:ingeniero).id,
        phone: "whatsapp:+573001234567"
      }
    end

    assert_response :created
    creado = User.find_by(email: "nueva_persona@controlmatica.test")
    assert_equal "whatsapp:+573001234567", creado.phone
    assert_equal "3001234567", creado.phone_normalized
  end

  test "get_users expone el telefono en el listado" do
    user = users(:ingeniero)
    as_user(users(:admin)) { user.update!(phone: "+57 300 123 4567") }

    get "/get_users", params: { per_page: 100 }

    assert_response :success
    fila = json_body["data"].find { |u| u["id"] == user.id }
    assert_not_nil fila, "El usuario no aparecio en el listado"
    assert_equal "+57 300 123 4567", fila["phone"]
  end

  test "configure_permitted_parameters permite phone en Devise" do
    # Los dos caminos de Devise (alta y actualizacion de cuenta) deben aceptar
    # el telefono; sin esto el registro por Devise lo descarta en silencio.
    crudos = ActionController::Parameters.new(
      user: { email: "x@controlmatica.test", phone: "3001234567", sign_in_count: 999 }
    )
    sanitizer = Devise::ParameterSanitizer.new(User, :user, crudos)

    controller = ApplicationController.new
    controller.define_singleton_method(:devise_parameter_sanitizer) { sanitizer }
    controller.send(:configure_permitted_parameters)

    [:sign_up, :account_update].each do |accion|
      limpio = sanitizer.sanitize(accion)
      assert_equal "3001234567", limpio["phone"], "#{accion} descarto el telefono"
      assert_nil limpio["sign_in_count"], "#{accion} dejo pasar un parametro no permitido"
    end
  end
end

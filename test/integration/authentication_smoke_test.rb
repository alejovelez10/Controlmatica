require "test_helper"

# Demuestra que el andamiaje de autenticacion y las aserciones JSON funcionan
# contra el codigo real. Es el minimo que los paquetes 04-12 dan por sentado.
class AuthenticationSmokeTest < ActionDispatch::IntegrationTest
  test "sign_in_as autentica y deja User.current seteado" do
    sign_in_as(users(:admin))
    assert_equal users(:admin), User.current

    get report_expenses_path
    assert_response :success
  end

  test "un endpoint JSON responde la forma data/total con el usuario autenticado" do
    sign_in_as(users(:admin))

    get get_report_expenses_path, params: { page: 1, per_page: 10 }

    datos = assert_json_list
    assert_kind_of Array, datos
    assert_kind_of Integer, json_body["total"]
  end

  test "sin autenticar, un endpoint protegido redirige al login" do
    # Caso de fallo, y ademas documenta un hecho incomodo: los endpoints
    # EXISTENTES redirigen 302 en vez de devolver 401/403 con cuerpo JSON.
    # Los endpoints NUEVOS si devuelven 403 JSON (arquitectura seccion 3).
    # Ningun paquete debe copiar el patron viejo.
    get get_report_expenses_path

    assert_redirected_to new_user_session_path
  end
end

require "test_helper"

# Pantalla de Roles: la seccion del agente de WhatsApp (paquete 17).
class RolsControllerTest < ActionDispatch::IntegrationTest
  test "la seccion del agente de WhatsApp va de ultima y los demas modulos siguen en orden alfabetico" do
    sign_in_as users(:admin)
    get "/get_modules_with_actions"

    assert_response :success
    nombres = response.parsed_body.map { |m| m["name"] }
    assert_equal Agente::Permisos::MODULO, nombres.last
    assert_equal nombres[0...-1].sort, nombres[0...-1]

    agente = response.parsed_body.last["accion_modules"].map { |a| a["name"] }
    assert_equal [Agente::Permisos::REGISTRAR_GASTO, Agente::Permisos::REGISTRAR_REPORTE].sort, agente.sort
  end
end

# frozen_string_literal: true

require "test_helper"

# Meta pide una URL publica de politica de privacidad para publicar la app de
# WhatsApp (paquete 17): tiene que abrir SIN sesion.
class PaginasPublicasControllerTest < ActionDispatch::IntegrationTest
  test "la politica de privacidad abre sin iniciar sesion" do
    get "/privacidad"
    assert_response :success
    assert_includes response.body, "Política de privacidad"
    assert_includes response.body, "Ley 1581"
  end
end

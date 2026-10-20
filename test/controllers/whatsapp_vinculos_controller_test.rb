# frozen_string_literal: true

require "test_helper"

# /whatsapp/vincular abre WhatsApp con el mensaje que vincula el numero
# (paquete 17, fase 4).
class WhatsappVinculosControllerTest < ActionDispatch::IntegrationTest
  include WhatsappTestHelpers

  test "sin sesion no entrega ningun token" do
    get "/whatsapp/vincular"
    assert_response :redirect
    refute_includes response.location.to_s, "wa.me"
  end

  test "con sesion redirige a WhatsApp con el mensaje de vincular ya escrito" do
    sign_in users(:ingeniero)
    con_whatsapp(WHATSAPP_NUMERO_PUBLICO: "+57 318 926 2630") do
      get "/whatsapp/vincular"
    end
    assert_response :redirect
    assert response.location.start_with?("https://wa.me/573189262630?text=vincular%20")
  end

  test "sin el numero configurado responde que el canal no esta listo" do
    sign_in users(:ingeniero)
    con_whatsapp(WHATSAPP_NUMERO_PUBLICO: "") do
      get "/whatsapp/vincular"
    end
    assert_response :service_unavailable
  end
end

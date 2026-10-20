# frozen_string_literal: true

require "test_helper"

# El hilo con el agente no se recorta: se cierra y se abre otro (paquete 17).
class WhatsappConversationTest < ActiveSupport::TestCase
  test "reutiliza la conversacion abierta del mismo telefono" do
    primera = WhatsappConversation.vigente_para(user: users(:ingeniero), wa_id: "573001234567", bsuid: nil)
    primera.update!(last_inbound_at: Time.current)
    segunda = WhatsappConversation.vigente_para(user: users(:ingeniero), wa_id: "573001234567", bsuid: nil)
    assert_equal primera, segunda
  end

  test "despues de dos horas sin escribir cierra la vieja y abre una nueva" do
    vieja = WhatsappConversation.create!(user: users(:ingeniero), wa_id: "573001234567",
                                         last_inbound_at: 3.hours.ago)
    nueva = WhatsappConversation.vigente_para(user: users(:ingeniero), wa_id: "573001234567", bsuid: nil)

    refute_equal vieja, nueva
    assert_equal "inactividad", vieja.reload.closed_reason
    assert nueva.abierta?
  end

  test "sin telefono busca la conversacion por BSUID" do
    previa = WhatsappConversation.create!(user: users(:ingeniero), bsuid: "CO.x", last_inbound_at: Time.current)
    assert_equal previa, WhatsappConversation.vigente_para(user: users(:ingeniero), wa_id: nil, bsuid: "CO.x")
  end

  test "una conversacion cerrada no se reabre" do
    WhatsappConversation.create!(user: users(:ingeniero), wa_id: "573001234567", closed_at: 1.minute.ago,
                                 closed_reason: "registro")
    nueva = WhatsappConversation.vigente_para(user: users(:ingeniero), wa_id: "573001234567", bsuid: nil)
    assert nueva.abierta?
    assert_equal 2, WhatsappConversation.where(wa_id: "573001234567").count
  end
end

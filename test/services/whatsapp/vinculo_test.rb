# frozen_string_literal: true

require "test_helper"

# Vincular un WhatsApp sin telefono (nombre de usuario de WhatsApp) a su
# usuario de Controlmatica (paquete 17, fase 4).
class Whatsapp::VinculoTest < ActiveSupport::TestCase
  include WhatsappTestHelpers

  def mensaje(texto, wa_id: nil, bsuid: "CO.nuevo-bsuid")
    WhatsappMessage.create!(wamid: "wamid.#{SecureRandom.hex(4)}", direction: WhatsappMessage::ENTRANTE,
                            wa_id: wa_id, bsuid: bsuid, message_type: "text", body: texto)
  end

  test "el token vincula el BSUID al usuario que lo pidio" do
    token = Whatsapp::Vinculo.token_para(users(:ingeniero))
    usuario, respuesta = Whatsapp::Vinculo.vincular(mensaje("vincular #{token}"))

    assert_equal users(:ingeniero), usuario
    assert_equal "CO.nuevo-bsuid", users(:ingeniero).reload.whatsapp_user_id
    assert_includes respuesta, "quedó vinculado"
  end

  test "un token vencido no vincula a nadie" do
    token = Whatsapp::Vinculo.token_para(users(:ingeniero))
    travel 31.minutes do
      usuario, respuesta = Whatsapp::Vinculo.vincular(mensaje("vincular #{token}"))
      assert_nil usuario
      assert_includes respuesta, "venció"
    end
    assert_nil users(:ingeniero).reload.whatsapp_user_id
  end

  test "un token alterado no vincula a nadie" do
    usuario, = Whatsapp::Vinculo.vincular(mensaje("vincular abc--def"))
    assert_nil usuario
  end

  test "el BSUID se le quita a quien lo tuviera antes" do
    users(:gerente).update_column(:whatsapp_user_id, "CO.nuevo-bsuid")
    Whatsapp::Vinculo.vincular(mensaje("vincular #{Whatsapp::Vinculo.token_para(users(:ingeniero))}"))
    assert_nil users(:gerente).reload.whatsapp_user_id
  end

  test "completa el telefono si el usuario no tenia y nadie mas lo usa" do
    users(:gerente).update_columns(phone: nil, phone_normalized: nil)
    Whatsapp::Vinculo.vincular(mensaje("vincular #{Whatsapp::Vinculo.token_para(users(:gerente))}",
                                       wa_id: "573155550001"))
    assert_equal "3155550001", users(:gerente).reload.phone_normalized
  end

  test "nunca pisa un telefono que ya cargo el administrador" do
    Whatsapp::Vinculo.vincular(mensaje("vincular #{Whatsapp::Vinculo.token_para(users(:ingeniero))}",
                                       wa_id: "573155550001"))
    assert_equal "3001234567", users(:ingeniero).reload.phone_normalized
  end

  test "la atencion vincula antes de intentar identificar" do
    cliente = FakeWhatsappClient.new
    texto = "vincular #{Whatsapp::Vinculo.token_para(users(:ingeniero))}"
    Whatsapp::Atencion.new(mensaje(texto), client: cliente).call
    assert_includes cliente.textos.last, "quedó vinculado"
  end

  test "con el numero publico configurado, el aviso de no registrado explica como vincularse" do
    con_whatsapp(WHATSAPP_NUMERO_PUBLICO: "+57 318 926 2630") do
      assert_includes Whatsapp::Identidad.mensaje_para(:no_registrado), "/whatsapp/vincular"
    end
  end
end

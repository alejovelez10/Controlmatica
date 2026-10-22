# frozen_string_literal: true

require "test_helper"

# Quien escribe por WhatsApp (paquete 17).
class Whatsapp::IdentidadTest < ActiveSupport::TestCase
  test "identifica por telefono con el indicativo pegado" do
    resultado = Whatsapp::Identidad.resolver(wa_id: "573001234567", bsuid: nil)
    assert resultado.encontrado?
    assert_equal users(:ingeniero), resultado.usuario
  end

  test "al identificar por telefono guarda el BSUID en el usuario" do
    Whatsapp::Identidad.resolver(wa_id: "573001234567", bsuid: "CO.abc123")
    assert_equal "CO.abc123", users(:ingeniero).reload.whatsapp_user_id
  end

  test "sin telefono, lo reconoce por el BSUID guardado" do
    users(:ingeniero).update_column(:whatsapp_user_id, "CO.abc123")
    resultado = Whatsapp::Identidad.resolver(wa_id: nil, bsuid: "CO.abc123")
    assert_equal users(:ingeniero), resultado.usuario
  end

  test "dos usuarios con el mismo numero son ninguno, nunca el primero" do
    resultado = Whatsapp::Identidad.resolver(wa_id: "573009999999", bsuid: nil)
    refute resultado.encontrado?
    assert_equal :ambiguo, resultado.motivo
  end

  test "un numero que no esta en ningun usuario no se identifica" do
    resultado = Whatsapp::Identidad.resolver(wa_id: "573111111111", bsuid: "CO.desconocido")
    refute resultado.encontrado?
    assert_equal :no_registrado, resultado.motivo
  end

  # ---- usuario de WhatsApp (quien oculta su numero) --------------------------

  test "sin telefono, lo reconoce por el usuario de WhatsApp y guarda el BSUID" do
    users(:ingeniero).update_column(:whatsapp_username, "juan.cm")
    resultado = Whatsapp::Identidad.resolver(wa_id: nil, bsuid: "CO.nuevo", username: "@Juan.CM")
    assert_equal users(:ingeniero), resultado.usuario
    assert_equal "CO.nuevo", users(:ingeniero).reload.whatsapp_user_id
  end

  test "el telefono manda sobre el usuario de WhatsApp" do
    users(:ingeniero_dos).update_column(:whatsapp_username, "juan.cm")
    resultado = Whatsapp::Identidad.resolver(wa_id: "573001234567", bsuid: nil, username: "juan.cm")
    assert_equal users(:ingeniero), resultado.usuario
  end

  # Alguien tomo un nombre de usuario que antes era de otra persona: el
  # usuario de Controlmatica ya estaba ligado a OTRO BSUID, y eso no se pisa.
  test "si el usuario ya esta ligado a otro BSUID, el nombre de usuario no basta" do
    users(:ingeniero).update_columns(whatsapp_username: "juan.cm", whatsapp_user_id: "CO.original")
    resultado = Whatsapp::Identidad.resolver(wa_id: nil, bsuid: "CO.otra.persona", username: "juan.cm")
    refute resultado.encontrado?
    assert_equal "CO.original", users(:ingeniero).reload.whatsapp_user_id
  end

  test "un usuario de WhatsApp que no esta en nadie no se identifica" do
    resultado = Whatsapp::Identidad.resolver(wa_id: nil, bsuid: "CO.x", username: "nadie.tiene.esto")
    assert_equal :no_registrado, resultado.motivo
  end

  test "si no lo encuentra, el aviso le dice cual es su usuario de WhatsApp" do
    texto = Whatsapp::Identidad.mensaje_para(:no_registrado, username: "@Pedro.Gomez")
    assert_includes texto, "*@pedro.gomez*"
    assert_includes texto, "Usuario de WhatsApp"
  end

  test "sin telefono y con un BSUID desconocido no se identifica" do
    resultado = Whatsapp::Identidad.resolver(wa_id: nil, bsuid: "CO.desconocido")
    assert_equal :no_registrado, resultado.motivo
  end
end

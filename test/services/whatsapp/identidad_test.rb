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

  test "sin telefono y con un BSUID desconocido no se identifica" do
    resultado = Whatsapp::Identidad.resolver(wa_id: nil, bsuid: "CO.desconocido")
    assert_equal :no_registrado, resultado.motivo
  end
end

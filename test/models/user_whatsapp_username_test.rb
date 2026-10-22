# frozen_string_literal: true

require "test_helper"

# Usuario de WhatsApp al lado del telefono (paquete 17): para quien oculta su
# numero con un nombre de usuario.
class UserWhatsappUsernameTest < ActiveSupport::TestCase
  setup do
    User.current = users(:admin) # los callbacks de auditoria de User lo leen
  end

  test "se guarda sin arroba, sin espacios y en minusculas" do
    usuario = users(:ingeniero)
    usuario.update!(whatsapp_username: "  @Juan.Perez_CM ")
    assert_equal "juan.perez_cm", usuario.reload.whatsapp_username
  end

  test "vacio queda en nil" do
    usuario = users(:ingeniero)
    usuario.update!(whatsapp_username: "@")
    assert_nil usuario.reload.whatsapp_username
  end

  test "no puede tener caracteres que WhatsApp no usa" do
    usuario = users(:ingeniero)
    refute usuario.update(whatsapp_username: "juan perez")
    assert_includes usuario.errors.full_messages.join, "letras, números, puntos y guiones bajos"
  end

  test "dos personas no pueden tener el mismo usuario de WhatsApp" do
    users(:ingeniero).update!(whatsapp_username: "juan.cm")
    otro = users(:ingeniero_dos)
    refute otro.update(whatsapp_username: "@JUAN.CM")
    assert_includes otro.errors.full_messages.join, "ya está en"
  end

  test "cambiar el telefono o el usuario de WhatsApp olvida el vinculo que WhatsApp ya habia ligado" do
    usuario = users(:ingeniero)
    usuario.update_column(:whatsapp_user_id, "CO.abc123")
    usuario.update!(whatsapp_username: "otro.usuario")
    assert_nil usuario.reload.whatsapp_user_id

    usuario.update_column(:whatsapp_user_id, "CO.abc123")
    usuario.update!(names: "Juan Carlos")
    assert_equal "CO.abc123", usuario.reload.whatsapp_user_id, "editar otro campo no lo toca"
  end
end

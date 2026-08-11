require 'test_helper'

# Normalizacion del telefono de usuario (User.normalize_phone + callback
# set_phone_normalized). La llave normalizada es la que usa el agente de
# WhatsApp para saber quien reporta un gasto, asi que un falso positivo aqui
# significa atribuirle el gasto a la persona equivocada.
class UserPhoneTest < ActiveSupport::TestCase
  # ─── User.normalize_phone ───

  test "normalize_phone toma los ultimos 10 digitos del numero con indicativo" do
    assert_equal "3001234567", User.normalize_phone("+57 300 123 4567")
  end

  test "normalize_phone limpia parentesis y guiones" do
    assert_equal "3001234567", User.normalize_phone("+57 (300) 123-4567")
  end

  test "normalize_phone limpia los espacios" do
    assert_equal "3001234567", User.normalize_phone("300 123 4567")
  end

  test "normalize_phone acepta el prefijo whatsapp de los gateways" do
    assert_equal "3001234567", User.normalize_phone("whatsapp:+573001234567")
  end

  test "normalize_phone deja intacto un numero de 10 digitos exactos" do
    assert_equal "3001234567", User.normalize_phone("3001234567")
  end

  test "normalize_phone deja los fijos de 7 digitos completos" do
    assert_equal "2345678", User.normalize_phone("2345678")
  end

  test "normalize_phone se queda con los ultimos 10 de un numero mas largo" do
    # 13 digitos: los 3 primeros (573) se descartan.
    assert_equal "0012345678", User.normalize_phone("5730012345678")
  end

  test "normalize_phone devuelve nil con menos de 7 digitos" do
    assert_nil User.normalize_phone("300 12")
    assert_nil User.normalize_phone("30012")
  end

  test "normalize_phone devuelve nil con nil, con cadena vacia y sin digitos" do
    assert_nil User.normalize_phone(nil)
    assert_nil User.normalize_phone("")
    assert_nil User.normalize_phone("abc")
  end

  # ─── Callback set_phone_normalized ───

  test "el callback llena phone_normalized al guardar" do
    user = users(:ingeniero)

    as_user(users(:admin)) { user.update!(phone: "+57 301 000 0000") }

    assert_equal "3010000000", user.reload.phone_normalized
  end

  test "cambiar el telefono recalcula phone_normalized" do
    user = users(:ingeniero)

    as_user(users(:admin)) do
      user.update!(phone: "+57 301 000 0000")
      user.update!(phone: "(302) 111-2222")
    end

    assert_equal "3021112222", user.reload.phone_normalized
  end

  test "dejar el telefono vacio deja phone_normalized en nil" do
    user = users(:ingeniero)

    as_user(users(:admin)) do
      user.update!(phone: "+57 301 000 0000")
      assert_equal "3010000000", user.reload.phone_normalized

      user.update!(phone: "")
    end

    assert_nil user.reload.phone_normalized
  end

  test "borrar el telefono con nil deja phone_normalized en nil" do
    user = users(:ingeniero)

    as_user(users(:admin)) do
      user.update!(phone: "+57 301 000 0000")
      user.update!(phone: nil)
    end

    assert_nil user.reload.phone_normalized
  end

  test "un telefono demasiado corto guarda el phone pero no la llave" do
    user = users(:ingeniero)

    as_user(users(:admin)) { user.update!(phone: "300 12") }
    user.reload

    assert_equal "300 12", user.phone
    assert_nil user.phone_normalized
  end

  test "el callback tambien corre al crear el usuario" do
    user = User.create!(
      email: "telefono_nuevo@controlmatica.test",
      password: AuthenticationHelpers::FIXTURE_PASSWORD,
      names: "Nuevo",
      rol: rols(:ingeniero),
      phone: "+57 (305) 999-8877"
    )

    assert_equal "3059998877", user.reload.phone_normalized
  end

  # ─── Scope by_normalized_phone ───

  test "by_normalized_phone encuentra al usuario por la llave normalizada" do
    user = users(:ingeniero)
    as_user(users(:admin)) { user.update!(phone: "+57 301 000 0000") }

    assert_equal [user.id], User.by_normalized_phone("3010000000").pluck(:id)
  end

  test "by_normalized_phone no devuelve nada con una llave sin duenos" do
    assert_empty User.by_normalized_phone("3229990000")
  end
end

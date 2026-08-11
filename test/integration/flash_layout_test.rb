require "test_helper"

# El layout pinta los avisos del servidor (`flash`). Paquete 13.
#
# POR QUE ESTO ES UNA PRUEBA Y NO UN DETALLE COSMETICO: los gates de permiso de
# Contabilidad y de Reglas de gastos expulsan al usuario con
# `redirect_to root_path, alert: "No tiene permiso..."`. Hasta el paquete 13
# NINGUN layout pintaba el flash (`grep -rn flash app/views/layouts` devolvia
# cero lineas), asi que la persona aterrizaba en el inicio sin explicacion y el
# sintoma era indistinguible de un enlace roto o de una sesion caida. Es el
# quinto de los cinco defectos que encontro correr la suite E2E en un navegador
# de verdad (pendiente #38), y el unico que la ola 7 dejo sin corregir.
#
# Aqui se prueba el CABLEADO —que el mensaje llega al HTML que recibe el
# navegador, atravesando el redirect—. El comportamiento del parcial suelto
# (las cinco claves, el escape, el vacio) vive en
# `test/helpers/flash_partial_test.rb`.
class FlashLayoutTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  test "expulsado de Contabilidad, el usuario ve el motivo en pantalla" do
    sign_in users(:sin_permisos)

    get accounting_expenses_path
    assert_redirected_to root_path

    follow_redirect!
    assert_response :success
    assert_select "[data-testid=?]", "flash-alert", 1
    assert_select "[data-testid=?]", "flash-alert",
                  text: /No tiene permiso para ingresar al módulo de Contabilidad/
  end

  test "expulsado de Reglas de gastos, el usuario ve el motivo en pantalla" do
    sign_in users(:sin_permisos)

    get expense_rules_path
    assert_redirected_to root_path

    follow_redirect!
    assert_response :success
    assert_select "[data-testid=?]", "flash-alert", 1
    assert_select "[data-testid=?]", "flash-alert",
                  text: /No tiene permiso para ingresar al módulo de Reglas de gastos/
  end

  test "el aviso lo pinta el layout, no la pantalla de destino" do
    # La prueba de arriba pasaria igual si alguien pusiera el render dentro de
    # `home/dashboard`. Esta comprueba que el aviso sobrevive en OTRA pantalla,
    # que es lo que hace que la correccion valga para todo el sistema y no solo
    # para el inicio.
    sign_in users(:sin_permisos)

    get accounting_expenses_path
    follow_redirect!

    assert_select "main.app-content [data-testid=?]", "flash-stack", 1
  end

  test "sin flash no se pinta ningun contenedor de avisos" do
    sign_in users(:admin)

    get root_path

    assert_response :success
    assert_select "[data-testid=?]", "flash-stack", 0
    assert_select ".cm-flash", 0
  end

  test "la pantalla de usuarios ya no invoca toastr, que no esta instalado" do
    # `home/index_user.html.erb` tenia su propio render de flash con
    # `toastr[...]`, libreria ausente del proyecto: el aviso nunca se veia y el
    # ReferenceError cortaba el resto del script. Se borro al centralizar el
    # flash en el layout; si alguien lo repone, esto lo detecta.
    sign_in users(:admin)

    get users_path

    assert_response :success
    assert_no_match(/toastr/, response.body,
                    "vuelve a haber una llamada a toastr, que no existe en este proyecto")
  end

  test "el flash no se pinta dos veces cuando la pantalla de destino es la de usuarios" do
    sign_in users(:sin_permisos)

    get accounting_expenses_path
    follow_redirect!

    assert_equal 1, response.body.scan(/data-testid="flash-alert"/).size,
                 "el aviso aparece duplicado: alguien volvio a renderizar el flash fuera del layout"
  end
end

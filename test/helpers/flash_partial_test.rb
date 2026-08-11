require "test_helper"

# `app/views/layouts/_flash.html.erb` suelto. Paquete 13.
#
# Se prueba el parcial y no el layout entero porque el layout necesita
# `current_user`, el menu completo y media docena de permisos: una prueba que
# arrastre todo eso no prueba el aviso, prueba el andamiaje. El cableado
# (que el mensaje sobreviva al redirect y llegue al navegador) lo cubre
# `test/integration/flash_layout_test.rb`.
class FlashPartialTest < ActionView::TestCase
  # `ActionView::TestCase` expone `flash` sobre un `ActionDispatch::Flash`
  # de verdad, asi que aqui si se puede escribir cualquier clave.
  def render_flash(pares = {})
    flash.clear
    pares.each { |clave, valor| flash[clave] = valor }
    render partial: "layouts/flash"
  end

  # --- Las cinco claves que la aplicacion usa de verdad ----------------------

  test "flash[:alert] se pinta como aviso de error" do
    render_flash(alert: "No tiene permiso para ingresar al módulo de Contabilidad")

    assert_select "[data-testid=?]", "flash-alert", 1
    assert_select ".cm-flash--alert",
                  text: /No tiene permiso para ingresar al módulo de Contabilidad/
  end

  test "flash[:error] se pinta como aviso de error" do
    render_flash(error: "Ocurrió un error al guardar")

    assert_select "[data-testid=?]", "flash-error", 1
    assert_select ".cm-flash--error", text: /Ocurrió un error al guardar/
  end

  test "flash[:notice] se pinta como aviso informativo" do
    # Lo usan `customers_controller` y `providers_controller` en sus redirects,
    # y Devise al cerrar sesion.
    render_flash(notice: "Cliente creado exitosamente.")

    assert_select "[data-testid=?]", "flash-notice", 1
    assert_select ".cm-flash--notice", text: /Cliente creado exitosamente\./
  end

  test "flash[:success] se pinta como aviso de exito" do
    render_flash(success: "Usuario creado")

    assert_select "[data-testid=?]", "flash-success", 1
    assert_select ".cm-flash--success", text: /Usuario creado/
  end

  test "flash[:delete] se pinta como aviso informativo" do
    # Clave heredada del bloque de `toastr` que vivia en
    # `home/index_user.html.erb`. Sigue viva en codigo legado: se mapea a
    # `notice` en vez de dejarla caer en silencio.
    render_flash(delete: "Se eliminó el registro")

    assert_select "[data-testid=?]", "flash-notice", 1
    assert_select ".cm-flash--notice", text: /Se eliminó el registro/
  end

  test "flash[:notice] gana sobre flash[:delete] cuando llegan los dos" do
    render_flash(notice: "El aviso real", delete: "El heredado")

    assert_select "[data-testid=?]", "flash-notice", 1
    assert_select ".cm-flash--notice", text: /El aviso real/
    assert_no_match(/El heredado/, rendered)
  end

  # --- Varios avisos a la vez ------------------------------------------------

  test "dos avisos de tipos distintos se pintan los dos" do
    render_flash(alert: "Sin permiso", notice: "Sesión iniciada")

    assert_select "[data-testid=?]", "flash-stack", 1
    assert_select ".cm-flash", 2
    assert_select "[data-testid=?]", "flash-alert", 1
    assert_select "[data-testid=?]", "flash-notice", 1
  end

  # --- Lo que NO debe pasar --------------------------------------------------

  test "sin flash no se pinta ningun contenedor" do
    render_flash

    assert_select "[data-testid=?]", "flash-stack", 0
    assert_select ".cm-flash", 0
    assert_equal "", rendered.strip
  end

  test "un flash vacio no pinta un recuadro en blanco" do
    # `redirect_to root_path, alert: ""` existe en codigo legado. Un recuadro
    # rojo vacio asusta mas que la ausencia de aviso.
    render_flash(alert: "", notice: "   ")

    assert_select "[data-testid=?]", "flash-stack", 0
    assert_equal "", rendered.strip
  end

  test "un mensaje con HTML se escapa y no se ejecuta" do
    render_flash(alert: "<script>alert(1)</script>")

    assert_select "[data-testid=?]", "flash-alert", 1
    assert_select "[data-testid='flash-alert'] script", 0
    assert_includes rendered, "&lt;script&gt;alert(1)&lt;/script&gt;"
  end

  test "un mensaje que llega como arreglo se une en una sola linea" do
    # Los controladores de este repo devuelven `message: [...]` en JSON; si
    # alguien pasa el mismo arreglo por flash, no debe salir el `["..."]` de
    # Ruby en pantalla.
    render_flash(alert: ["Falta la factura", "Falta el proveedor"])

    assert_select ".cm-flash--alert", text: /Falta la factura Falta el proveedor/
    assert_no_match(/\[&quot;/, rendered)
  end

  test "el contenedor lleva role=alert para los lectores de pantalla" do
    render_flash(alert: "Sin permiso")

    assert_select ".cm-flash[role=?]", "alert", 1
  end
end

# frozen_string_literal: true

require "test_helper"

# Resolucion del actor de las tools MCP (paquete 11, tarea 3).
#
# Es la pieza mas delicada del paquete: de aqui depende a nombre de quien queda
# un gasto que entro por WhatsApp. Un fallo silencioso aqui no rompe nada
# visible, solo atribuye el gasto a la persona equivocada.
class ApplicationToolActorTest < ActiveSupport::TestCase
  include McpTestHelpers

  # --- Autorizacion ---------------------------------------------------------

  test "current_tenant rechaza api key vacia" do
    with_mcp_key { assert_nil ApplicationTool.current_tenant(ctx(api_key: "")) }
  end

  test "current_tenant rechaza api key incorrecta" do
    with_mcp_key { assert_nil ApplicationTool.current_tenant(ctx(api_key: "otra-key")) }
  end

  test "current_tenant acepta la api key correcta" do
    with_mcp_key { assert_equal ApplicationTool::TENANT, ApplicationTool.current_tenant(ctx) }
  end

  test "current_tenant es nil si MCP_API_KEY no esta seteada" do
    with_env("MCP_API_KEY", nil) do
      assert_nil ApplicationTool.current_tenant(ctx(api_key: "cualquiera"))
    end
  end

  # --- Telefono -------------------------------------------------------------

  test "actor_user_by_phone resuelve por telefono normalizado" do
    assert_equal users(:ingeniero),
                 ApplicationTool.actor_user_by_phone(ctx(actor_phone: "+57 300 123 4567"))
  end

  test "actor_user_by_phone acepta formato de gateway" do
    assert_equal users(:ingeniero),
                 ApplicationTool.actor_user_by_phone(ctx(actor_phone: "whatsapp:+573001234567"))
  end

  test "actor_user_by_phone devuelve nil si el telefono esta repetido" do
    # Dos usuarios con el mismo phone_normalized: ambiguedad = nadie.
    assert_nil ApplicationTool.actor_user_by_phone(ctx(actor_phone: "+57 300 999 9999"))
  end

  test "actor_user_by_phone devuelve nil sin match" do
    assert_nil ApplicationTool.actor_user_by_phone(ctx(actor_phone: "+57 322 000 0000"))
  end

  test "actor_user_by_phone devuelve nil sin telefono en el contexto" do
    assert_nil ApplicationTool.actor_user_by_phone(ctx)
  end

  test "actor_user_by_phone devuelve nil con un telefono demasiado corto" do
    assert_nil ApplicationTool.actor_user_by_phone(ctx(actor_phone: "30012"))
  end

  # --- Estricto vs laxo -----------------------------------------------------

  test "actor_user_strict prefiere el correo sobre el telefono" do
    resuelto = ApplicationTool.actor_user_strict(
      ctx(actor_email: users(:admin).email, actor_phone: "+57 300 123 4567")
    )
    assert_equal users(:admin), resuelto
  end

  test "actor_user_strict NO cae al Administrador" do
    assert_nil ApplicationTool.actor_user_strict(
      ctx(actor_email: "nadie@ejemplo.test", actor_phone: "+57 322 000 0000")
    )
  end

  test "actor_user laxo si cae al Administrador" do
    resuelto = ApplicationTool.actor_user(
      ApplicationTool::TENANT,
      ctx(actor_email: "nadie@ejemplo.test", actor_phone: "+57 322 000 0000")
    )
    assert_equal users(:admin), resuelto
  end

  test "actor_user laxo resuelve por telefono antes del fallback" do
    resuelto = ApplicationTool.actor_user(ApplicationTool::TENANT,
                                          ctx(actor_phone: "+57 300 123 4567"))
    assert_equal users(:ingeniero), resuelto
  end

  # --- as_actor_strict ------------------------------------------------------

  test "as_actor_strict setea y restaura User.current" do
    User.current = users(:admin)
    dentro = nil
    ApplicationTool.as_actor_strict(ApplicationTool::TENANT,
                                    ctx(actor_phone: "+57 300 123 4567")) do |actor|
      dentro = User.current
      assert_equal users(:ingeniero), actor
      ApplicationTool.text("ok")
    end
    assert_equal users(:ingeniero), dentro
    assert_equal users(:admin), User.current
  end

  test "as_actor_strict no ejecuta el bloque sin actor y devuelve el mensaje" do
    ejecutado = false
    res = ApplicationTool.as_actor_strict(ApplicationTool::TENANT, ctx) do
      ejecutado = true
      ApplicationTool.text("no deberia")
    end
    refute ejecutado
    assert_includes tool_text(res), "no se pudo identificar"
  end

  # ESTE ES EL TEST DEL BUG DEL `ensure` A NIVEL DE METODO: si el ensure viviera
  # en el `def`, el return temprano lo dispararia con `previous` sin asignar y
  # dejaria User.current en nil para todo el resto del request.
  test "as_actor_strict sin actor NO ensucia User.current" do
    User.current = users(:admin)
    ApplicationTool.as_actor_strict(ApplicationTool::TENANT, ctx) { ApplicationTool.text("x") }
    assert_equal users(:admin), User.current
  end

  test "as_actor_strict restaura User.current si el bloque lanza" do
    User.current = users(:admin)
    assert_raises(RuntimeError) do
      ApplicationTool.as_actor_strict(ApplicationTool::TENANT,
                                      ctx(actor_phone: "+57 300 123 4567")) { raise "boom" }
    end
    assert_equal users(:admin), User.current
  end

  test "NO_ACTOR_MESSAGE es visible desde las subclases" do
    # Si la constante se definiera dentro de `class << self`, esta linea
    # levantaria NameError en tiempo de ejecucion dentro de la tool.
    assert_includes ReportExpensesCreateTool::NO_ACTOR_MESSAGE, "no se pudo identificar"
  end
end

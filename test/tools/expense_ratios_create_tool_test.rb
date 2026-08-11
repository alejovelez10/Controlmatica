# frozen_string_literal: true

require "test_helper"

# Anticipos por MCP: el mismo criterio estricto de actor que los gastos
# (paquete 11, tarea 8, discrepancia D5). Un anticipo es plata que alguien
# recibe: no puede quedar a nombre del Administrador porque faltó un header.
class ExpenseRatiosCreateToolTest < ActiveSupport::TestCase
  include McpTestHelpers

  def crear(ctx_args = {}, **args)
    ExpenseRatiosCreateTool.call(server_context: ctx(**ctx_args),
                                 user_direction_id: users(:gerente).id,
                                 anticipo: 200_000, **args)
  end

  test "sin actor identificado NO crea el anticipo" do
    with_mcp_key do
      assert_no_difference("ExpenseRatio.count") do
        assert_tool_error crear, "no se pudo identificar"
      end
    end
  end

  test "crea el anticipo a nombre de la persona del telefono" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" })
      creado = ExpenseRatio.find(tool_json(res)["id"])
      assert_equal users(:ingeniero).id, creado.user_report_id
      assert_equal users(:ingeniero).id, creado.user_id
    end
  end

  test "un telefono repetido en dos usuarios NO crea el anticipo" do
    with_mcp_key do
      assert_no_difference("ExpenseRatio.count") do
        assert_tool_error crear({ actor_phone: "+57 300 999 9999" }), "no se pudo identificar"
      end
    end
  end

  test "con user_report_id explicito si crea aunque no haya actor" do
    with_mcp_key do
      res = crear({}, user_report_id: users(:contador).id)
      assert_equal users(:contador).id, ExpenseRatio.find(tool_json(res)["id"]).user_report_id
    end
  end

  test "MCP_STRICT_EXPENSE_ACTOR=false restaura el fallback" do
    with_mcp_key do
      with_env("MCP_STRICT_EXPENSE_ACTOR", "false") do
        res = crear
        assert_equal users(:admin).id, ExpenseRatio.find(tool_json(res)["id"]).user_report_id
      end
    end
  end

  test "restaura User.current al terminar" do
    User.current = nil
    with_mcp_key { crear({ actor_phone: "+57 300 123 4567" }) }
    assert_nil User.current
  end

  test "sin api key devuelve unauthorized" do
    with_mcp_key { assert_tool_error crear({ api_key: "mala" }), "Unauthorized" }
  end
end

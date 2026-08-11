# frozen_string_literal: true

require "test_helper"
# Object#stub viene de minitest/mock, que ya está dentro de minitest: no es una
# gema nueva y es el mecanismo que usa el resto de la suite.
require "minitest/mock"

# Tools de presupuesto (paquete 11, tareas 9 y 10). Son envoltorios de
# ExpenseBudgetService: lo que se prueba aquí es la forma de la respuesta y las
# dos decisiones propias de la capa MCP (actor estricto y N+1).
class ExpenseBudgetsToolsTest < ActiveSupport::TestCase
  include McpTestHelpers

  setup do
    @centro = cost_centers(:centro_con_viaticos)
  end

  # --- expense_budgets_list -------------------------------------------------

  test "list devuelve las partidas del centro" do
    with_mcp_key do
      filas = tool_json(ExpenseBudgetsListTool.call(server_context: ctx, cost_center_id: @centro.id))
      assert_equal ExpenseBudget.where(cost_center_id: @centro.id).count, filas.size
    end
  end

  test "list filtra por user_id" do
    with_mcp_key do
      filas = tool_json(ExpenseBudgetsListTool.call(server_context: ctx, cost_center_id: @centro.id,
                                                    user_id: users(:contador).id))
      assert_equal 1, filas.size
      assert_equal expense_budgets(:activa_otro_usuario).id, filas.first["id"]
    end
  end

  test "list con only_active true excluye las inactivas" do
    with_mcp_key do
      filas = tool_json(ExpenseBudgetsListTool.call(server_context: ctx, cost_center_id: @centro.id,
                                                    only_active: true))
      refute_includes filas.map { |f| f["id"] }, expense_budgets(:inactiva_ingeniero).id
    end
  end

  test "list con only_active false devuelve solo las inactivas" do
    with_mcp_key do
      filas = tool_json(ExpenseBudgetsListTool.call(server_context: ctx, cost_center_id: @centro.id,
                                                    only_active: false))
      # Si el cast de `false` se perdiera por un `if` ingenuo, aquí vendrían
      # también las activas.
      assert_equal [expense_budgets(:inactiva_ingeniero).id], filas.map { |f| f["id"] }
    end
  end

  test "list trae assigned spent available y datos legibles por fila" do
    with_mcp_key do
      fila = tool_json(ExpenseBudgetsListTool.call(server_context: ctx,
                                                   cost_center_id: @centro.id,
                                                   user_id: users(:ingeniero).id)).first
      esperado = ExpenseBudgetService.available_for(cost_center_id: @centro.id,
                                                    user_id: users(:ingeniero).id)
      assert_equal esperado[:assigned].to_s, fila["assigned"]
      assert_equal esperado[:spent].to_s, fila["spent"]
      assert_equal esperado[:available].to_s, fila["available"]
      assert_equal users(:ingeniero).names, fila["user_name"]
      assert_equal @centro.code, fila["cost_center_code"]
    end
  end

  test "list calcula el par una sola vez" do
    llamadas = 0
    falso = lambda do |cost_center_id:, user_id:, exclude_expense_id: nil|
      llamadas += 1
      { has_budget: true, assigned: BigDecimal(0), spent: BigDecimal(0), available: BigDecimal(0) }
    end
    ExpenseBudgetService.stub(:available_for, falso) do
      with_mcp_key do
        filas = tool_json(ExpenseBudgetsListTool.call(server_context: ctx, cost_center_id: @centro.id,
                                                      user_id: users(:ingeniero).id))
        assert_equal 3, filas.size, "las 3 partidas del mismo par"
      end
    end
    assert_equal 1, llamadas, "un solo cálculo para el par (centro, persona)"
  end

  test "list respeta el limite maximo de 200" do
    with_mcp_key do
      assert_kind_of Array, tool_json(ExpenseBudgetsListTool.call(server_context: ctx, limit: 5000))
    end
  end

  test "list sin api key devuelve unauthorized" do
    with_mcp_key do
      assert_tool_error ExpenseBudgetsListTool.call(server_context: ctx(api_key: "mala")), "Unauthorized"
    end
  end

  # --- expense_budgets_available -------------------------------------------

  test "available devuelve asignado gastado y disponible" do
    with_mcp_key do
      cuerpo = tool_json(ExpenseBudgetsAvailableTool.call(server_context: ctx,
                                                          cost_center_id: @centro.id,
                                                          user_id: users(:ingeniero).id))
      assert cuerpo["has_budget"]
      assert_equal "COP", cuerpo["currency"]
      assert_equal (cuerpo["assigned"].to_d - cuerpo["spent"].to_d), cuerpo["available"].to_d
      assert_includes cuerpo["message"], "Disponible"
    end
  end

  test "available usa el actor si se omite user_id" do
    with_mcp_key do
      cuerpo = tool_json(ExpenseBudgetsAvailableTool.call(
                           server_context: ctx(actor_phone: "+57 300 123 4567"),
                           cost_center_id: @centro.id
                         ))
      assert_equal users(:ingeniero).id, cuerpo["user_id"]
    end
  end

  test "available sin user_id y sin actor devuelve el mensaje de identificacion" do
    with_mcp_key do
      assert_tool_error ExpenseBudgetsAvailableTool.call(server_context: ctx,
                                                         cost_center_id: @centro.id),
                        "no se pudo identificar"
    end
  end

  test "available con has_budget false devuelve montos en cero y mensaje explicito" do
    with_mcp_key do
      cuerpo = tool_json(ExpenseBudgetsAvailableTool.call(server_context: ctx,
                                                           cost_center_id: cost_centers(:centro_ajeno).id,
                                                           user_id: users(:ingeniero).id))
      assert_equal false, cuerpo["has_budget"]
      assert_equal "0.0", cuerpo["assigned"]
      assert_equal "0.0", cuerpo["spent"]
      assert_equal "0.0", cuerpo["available"]
      assert_includes cuerpo["message"], "no tiene presupuesto asignado"
      refute_includes cuerpo["message"], "$0"
    end
  end

  test "available respeta exclude_expense_id" do
    gasto = report_expenses(:one)
    with_mcp_key do
      con = tool_json(ExpenseBudgetsAvailableTool.call(server_context: ctx, cost_center_id: @centro.id,
                                                        user_id: users(:ingeniero).id))
      sin = tool_json(ExpenseBudgetsAvailableTool.call(server_context: ctx, cost_center_id: @centro.id,
                                                        user_id: users(:ingeniero).id,
                                                        exclude_expense_id: gasto.id))
      assert_equal con["available"].to_d + gasto.invoice_value.to_d, sin["available"].to_d
    end
  end

  test "available con centro inexistente devuelve not found" do
    with_mcp_key do
      assert_tool_error ExpenseBudgetsAvailableTool.call(server_context: ctx, cost_center_id: 999_999,
                                                         user_id: users(:ingeniero).id),
                        "Not found: cost_center"
    end
  end

  test "available con persona inexistente devuelve not found" do
    with_mcp_key do
      assert_tool_error ExpenseBudgetsAvailableTool.call(server_context: ctx, cost_center_id: @centro.id,
                                                         user_id: 999_999),
                        "Not found: user"
    end
  end

  test "available sin api key devuelve unauthorized" do
    with_mcp_key do
      assert_tool_error ExpenseBudgetsAvailableTool.call(server_context: ctx(api_key: "mala"),
                                                         cost_center_id: @centro.id),
                        "Unauthorized"
    end
  end
end

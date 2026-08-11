# frozen_string_literal: true

require "test_helper"

# Política de exposición del servidor MCP (paquete 11, tarea 4).
#
# No es un test cosmético: `exposed?` es lo único que impide que las tools de
# update y delete, que existen en el código, sean invocables por cualquiera que
# tenga el MCP_API_KEY.
class McpControllerExposureTest < ActiveSupport::TestCase
  include McpTestHelpers

  NUEVAS = %w[expense_budgets_list expense_budgets_available exchange_rates_get
              expense_rules_validate expense_rules_list report_expenses_receipt_url_get
              report_expenses_attach_receipt users_find_by_phone].freeze

  test "las tools nuevas quedan expuestas" do
    NUEVAS.each { |nombre| assert McpController.exposed?(nombre), "#{nombre} deberia estar expuesta" }
  end

  test "las tools de update y delete siguen ocultas" do
    %w[report_expenses_update report_expenses_delete cost_centers_delete
       cost_centers_change_execution_state].each do |nombre|
      refute McpController.exposed?(nombre), "#{nombre} NO deberia estar expuesta"
    end
  end

  test "MCP_ENABLE_WRITES=all expone todo" do
    with_env("MCP_ENABLE_WRITES", "all") do
      assert McpController.exposed?("report_expenses_delete")
    end
  end

  test "ALWAYS_EXPOSED tiene exactamente 6 nombres" do
    assert_equal 6, McpController::ALWAYS_EXPOSED.size
  end

  test "ALWAYS_EXPOSED no contiene nombres que ya se auto-exponen" do
    # Higiene: una lista con nombres redundantes se desincroniza del sufijo y
    # nadie se entera hasta que alguien renombra una tool.
    McpController::ALWAYS_EXPOSED.each do |nombre|
      refute nombre.end_with?("_list", "_get", "_create"),
             "#{nombre} ya se auto-expone por sufijo: sobra en ALWAYS_EXPOSED"
    end
  end

  test "mcp_tools registra las clases nuevas" do
    registradas = McpController.mcp_tools
    [ExpenseBudgetsAvailableTool, ExpenseRulesValidateTool, ExpenseRulesListTool,
     ReportExpensesAttachReceiptTool, UsersFindByPhoneTool, ExpenseBudgetsListTool,
     ExchangeRatesGetTool, ReportExpensesReceiptUrlGetTool].each do |klass|
      assert_includes registradas, klass
    end
  end

  test "mcp_tools no incluye ApplicationTool" do
    refute_includes McpController.mcp_tools, ApplicationTool
  end

  test "mcp_tools no registra ninguna tool de update ni de delete" do
    nombres = McpController.mcp_tools.map(&:tool_name)
    assert_empty nombres.select { |n| n.end_with?("_update", "_delete") }
  end

  test "cada archivo de tool constantiza" do
    # Si el nombre de un archivo no casa con su clase, el auto-descubrimiento
    # revienta el endpoint ENTERO, no solo esa tool.
    Dir[Rails.root.join("app/tools/*_tool.rb")].each do |path|
      basename = File.basename(path, ".rb")
      assert basename.camelize.constantize, basename
    end
  end
end

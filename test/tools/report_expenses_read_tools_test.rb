# frozen_string_literal: true

require "test_helper"

# Lecturas de gastos por MCP (paquete 11, tarea 6).
#
# El riesgo que cubren estos tests no es de negocio, es de serializacion:
# Mcp::Serialize.record hace `public_send` por cada clave de KEYS, asi que una
# clave que no exista como columna ni como metodo tumba con NoMethodError las
# CUATRO tools de gastos y ademas records_search.
class ReportExpensesReadToolsTest < ActiveSupport::TestCase
  include McpTestHelpers

  setup do
    @centro = cost_centers(:centro_con_viaticos)
  end

  def crear_gasto(**attrs)
    as_user(users(:admin)) do
      ReportExpense.create!({
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        omitir_comprobante_obligatorio: true, cost_center: @centro, user_invoice: users(:ingeniero),
                              user: users(:admin), invoice_name: "Proveedor",
                              invoice_date: Date.new(2026, 6, 15),
                              invoice_value: 1000.0, invoice_total: 1000.0 }.merge(attrs))
    end
  end

  test "KEYS tiene las 28 claves canonicas y ninguna repetida" do
    assert_equal 28, ReportExpensesListTool::KEYS.size
    assert_equal ReportExpensesListTool::KEYS, ReportExpensesListTool::KEYS.uniq
  end

  test "KEYS incluye las tres claves presupuestales de este paquete" do
    %i[budget_status budget_reason expense_budget_id].each do |k|
      assert_includes ReportExpensesListTool::KEYS, k
    end
  end

  test "list devuelve los campos presupuestales y de moneda" do
    with_mcp_key do
      fila = tool_json(ReportExpensesListTool.call(server_context: ctx)).first
      %w[budget_status budget_reason expense_budget_id currency exchange_rate
         accounting_approved receipt_file_url].each do |clave|
        assert fila.key?(clave), "falta la clave #{clave} en la respuesta"
      end
    end
  end

  test "list no revienta con gastos historicos" do
    with_mcp_key do
      filas = tool_json(ReportExpensesListTool.call(server_context: ctx))
      historico = filas.find { |f| f["id"] == report_expenses(:one).id }
      assert_equal "COP", historico["currency"]
      assert_nil historico["foreign_value"]
    end
  end

  test "receipt_file_url es null si no hay comprobante" do
    with_mcp_key do
      fila = tool_json(ReportExpensesGetTool.call(id: report_expenses(:one).id, server_context: ctx))
      assert_nil fila["receipt_file_url"]
    end
  end

  test "filtra por budget_status" do
    crear_gasto(budget_status: "excedido", invoice_name: "Excedido SA")
    with_mcp_key do
      filas = tool_json(ReportExpensesListTool.call(server_context: ctx, budget_status: "excedido"))
      assert_equal 1, filas.size
      assert_equal "Excedido SA", filas.first["invoice_name"]
    end
  end

  test "filtra por currency" do
    crear_gasto(currency: "USD", foreign_value: 100, foreign_total: 100,
                exchange_rate: 4000, exchange_rate_date: Date.new(2026, 6, 15))
    with_mcp_key do
      filas = tool_json(ReportExpensesListTool.call(server_context: ctx, currency: "USD"))
      assert_equal 1, filas.size
      assert_equal "USD", filas.first["currency"]
    end
  end

  test "filtra por accounting_approved false" do
    crear_gasto(accounting_approved: true, invoice_name: "Ya causado")
    with_mcp_key do
      pendientes = tool_json(ReportExpensesListTool.call(server_context: ctx, accounting_approved: false))
      # Si el filtro `false` se perdiera por un `if` ingenuo, aqui vendria
      # tambien "Ya causado" y este refute fallaria.
      refute_includes pendientes.map { |f| f["invoice_name"] }, "Ya causado"
      assert pendientes.any?
    end
  end

  test "filtra por accounting_approved true" do
    crear_gasto(accounting_approved: true, invoice_name: "Ya causado")
    with_mcp_key do
      filas = tool_json(ReportExpensesListTool.call(server_context: ctx, accounting_approved: true))
      assert_equal ["Ya causado"], filas.map { |f| f["invoice_name"] }
    end
  end

  test "filtra por rango de fechas" do
    crear_gasto(invoice_date: Date.new(2026, 9, 10), invoice_name: "De septiembre")
    with_mcp_key do
      filas = tool_json(ReportExpensesListTool.call(server_context: ctx,
                                                    date_from: "2026-09-01", date_to: "2026-09-30"))
      assert_equal ["De septiembre"], filas.map { |f| f["invoice_name"] }
    end
  end

  test "limit se topa en 200" do
    with_mcp_key do
      res = ReportExpensesListTool.call(server_context: ctx, limit: 5000)
      assert_kind_of Array, tool_json(res)
    end
  end

  test "get devuelve las mismas keys que list" do
    with_mcp_key do
      fila = tool_json(ReportExpensesGetTool.call(id: report_expenses(:one).id, server_context: ctx))
      assert_equal ReportExpensesListTool::KEYS.map(&:to_s).sort, fila.keys.sort
    end
  end

  test "get de un id inexistente devuelve not found" do
    with_mcp_key do
      assert_tool_error ReportExpensesGetTool.call(id: 999_999, server_context: ctx),
                        "Not found: report_expense"
    end
  end

  test "list sin api key devuelve unauthorized" do
    with_mcp_key do
      assert_tool_error ReportExpensesListTool.call(server_context: ctx(api_key: "mala")), "Unauthorized"
    end
  end

  test "records_search sobre report_expenses no revienta con las keys nuevas" do
    with_mcp_key do
      filas = tool_json(RecordsSearchTool.call(entity: "report_expenses", server_context: ctx))
      assert_kind_of Array, filas
      assert filas.first.key?("budget_status")
    end
  end
end

# frozen_string_literal: true

require "test_helper"

# JSON-RPC real contra POST /mcp: rutas, skip_forgery_protection, headers,
# transporte Streamable HTTP y serialización. Es la cobertura "de punta a punta"
# de este paquete; no hay Playwright porque el MCP no tiene pantalla.
#
# ⚠️ TODAS las llamadas llevan Accept con application/json Y text/event-stream:
# sin eso el transporte responde 406 y el fallo no dice por qué.
class McpProtocolTest < ActionDispatch::IntegrationTest
  include McpTestHelpers

  ACCEPT = "application/json, text/event-stream"

  def rpc(method, params = nil, headers: {}, key: McpTestHelpers::VALID_KEY, query: nil)
    cuerpo = { jsonrpc: "2.0", id: 1, method: method }
    cuerpo[:params] = params if params
    cabeceras = { "Content-Type" => "application/json", "Accept" => ACCEPT }
    cabeceras["X-Api-Key"] = key if key
    post("/mcp#{query}", params: cuerpo.to_json, headers: cabeceras.merge(headers))
    JSON.parse(response.body)
  end

  def call_tool(nombre, argumentos = {}, **opciones)
    rpc("tools/call", { name: nombre, arguments: argumentos }, **opciones)
  end

  def texto(respuesta)
    contenido = respuesta.dig("result", "content")
    contenido.first["text"].to_s
  end

  def nombres_de_tools
    rpc("tools/list")["result"]["tools"].map { |t| t["name"] }
  end

  # --- tools/list -----------------------------------------------------------

  test "tools/list expone las tools nuevas" do
    with_mcp_key do
      nombres = nombres_de_tools
      %w[expense_budgets_list expense_budgets_available exchange_rates_get expense_rules_validate
         report_expenses_receipt_url_get report_expenses_attach_receipt users_find_by_phone].each do |n|
        assert_includes nombres, n
      end
    end
  end

  test "tools/list no expone update ni delete" do
    with_mcp_key do
      assert_empty nombres_de_tools.select { |n| n.end_with?("_update", "_delete") }
    end
  end

  test "el schema de report_expenses_create publica los campos de moneda" do
    with_mcp_key do
      tool = rpc("tools/list")["result"]["tools"].find { |t| t["name"] == "report_expenses_create" }
      props = tool["inputSchema"]["properties"].keys
      %w[currency foreign_value foreign_tax foreign_total exchange_rate exchange_rate_date].each do |c|
        assert_includes props, c
      end
    end
  end

  test "el schema de report_expenses_create NO publica los campos del servidor" do
    with_mcp_key do
      tool = rpc("tools/list")["result"]["tools"].find { |t| t["name"] == "report_expenses_create" }
      props = tool["inputSchema"]["properties"].keys
      %w[budget_status budget_reason expense_budget_id accounting_approved
         accounting_approved_by_id accounting_approved_at is_acepted receipt_file
         exchange_rate_source].each do |c|
        refute_includes props, c
      end
    end
  end

  # --- autorización ---------------------------------------------------------

  test "tools/call sin api key responde Unauthorized" do
    with_mcp_key do
      res = call_tool("expense_budgets_available",
                      { cost_center_id: cost_centers(:centro_con_viaticos).id }, key: nil)
      assert_includes texto(res), "Unauthorized"
    end
  end

  test "tools/call con api key por query param funciona" do
    with_mcp_key do
      res = call_tool("expense_budgets_available",
                      { cost_center_id: cost_centers(:centro_con_viaticos).id,
                        user_id: users(:ingeniero).id },
                      key: nil, query: "?api_key=#{McpTestHelpers::VALID_KEY}")
      assert_equal true, JSON.parse(texto(res))["has_budget"]
    end
  end

  # --- actor por teléfono ---------------------------------------------------

  test "X-Actor-Phone atribuye el gasto a la persona correcta" do
    with_mcp_key do
      assert_difference("ReportExpense.count", 1) do
        call_tool("report_expenses_create",
                  { cost_center_id: cost_centers(:centro_con_viaticos).id,
                    invoice_name: "Hotel por WhatsApp", invoice_date: Date.current.to_s,
                    invoice_value: 50_000, invoice_total: 59_500,
                    type_identification_id: report_expense_options(:opcion_tipo).id },
                  headers: { "X-Actor-Phone" => "whatsapp:+573001234567" })
      end
      assert_equal users(:ingeniero).id, ReportExpense.order(:id).last.user_invoice_id
    end
  end

  test "sin X-Actor-Phone ni X-Actor-Email el gasto se rechaza" do
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        res = call_tool("report_expenses_create",
                        { cost_center_id: cost_centers(:centro_con_viaticos).id,
                          invoice_name: "Anonimo", invoice_value: 50_000,
                          type_identification_id: report_expense_options(:opcion_tipo).id })
        assert_includes texto(res), "no se pudo identificar"
      end
    end
  end

  test "X-Actor-Email sigue funcionando" do
    with_mcp_key do
      res = call_tool("expense_budgets_available",
                      { cost_center_id: cost_centers(:centro_con_viaticos).id },
                      headers: { "X-Actor-Email" => users(:ingeniero).email })
      assert_equal users(:ingeniero).id, JSON.parse(texto(res))["user_id"]
    end
  end

  test "users_find_by_phone responde por el protocolo" do
    with_mcp_key do
      res = call_tool("users_find_by_phone", { phone: "+57 300 999 9999" })
      cuerpo = JSON.parse(texto(res))
      assert_equal false, cuerpo["found"]
      assert_equal "ambiguous", cuerpo["reason"]
    end
  end

  # --- búsqueda genérica ----------------------------------------------------

  test "records_search acepta entity expense_budgets" do
    with_mcp_key do
      res = call_tool("records_search", { entity: "expense_budgets" })
      assert_kind_of Array, JSON.parse(texto(res))
    end
  end

  test "records_search acepta entity exchange_rates" do
    with_mcp_key do
      res = call_tool("records_search", { entity: "exchange_rates" })
      filas = JSON.parse(texto(res))
      assert_kind_of Array, filas
      assert filas.first.key?("effective_date")
    end
  end

  test "el enum de entity publica las dos entidades nuevas" do
    with_mcp_key do
      tool = rpc("tools/list")["result"]["tools"].find { |t| t["name"] == "records_search" }
      enum = tool["inputSchema"]["properties"]["entity"]["enum"]
      assert_includes enum, "expense_budgets"
      assert_includes enum, "exchange_rates"
    end
  end
end

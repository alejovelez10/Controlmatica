# frozen_string_literal: true

require "test_helper"

# report_expense_options_list (paquete MCP): cobertura nueva del incidente de
# prod (conversacion f90ac3e8, 2026-09-09) donde `category: "tipo de gasto"`
# devolvio `[]` y el modelo relleno el vacio inventando una lista completa.
class ReportExpenseOptionsListToolTest < ActiveSupport::TestCase
  include McpTestHelpers

  test "sin api key devuelve unauthorized" do
    with_mcp_key do
      res = ReportExpenseOptionsListTool.call(server_context: ctx(api_key: "mala"))
      assert_tool_error res, "Unauthorized"
    end
  end

  test "sin filtro devuelve el catalogo completo" do
    with_mcp_key do
      res = ReportExpenseOptionsListTool.call(server_context: ctx)
      filas = tool_json(res)
      assert_equal ReportExpenseOption.count, filas.size
      ids = filas.map { |f| f["id"] }
      assert_includes ids, report_expense_options(:opcion_tipo).id
      assert_includes ids, report_expense_options(:opcion_pago).id
    end
  end

  test "con category Tipo devuelve solo esa categoria" do
    with_mcp_key do
      res = ReportExpenseOptionsListTool.call(server_context: ctx, category: "Tipo")
      filas = tool_json(res)
      assert filas.all? { |f| f["category"] == "Tipo" }
      ids = filas.map { |f| f["id"] }
      assert_includes ids, report_expense_options(:opcion_tipo).id
      refute_includes ids, report_expense_options(:opcion_pago).id
    end
  end

  test "con category Medio de pago devuelve solo esa categoria" do
    with_mcp_key do
      res = ReportExpenseOptionsListTool.call(server_context: ctx, category: "Medio de pago")
      filas = tool_json(res)
      assert filas.all? { |f| f["category"] == "Medio de pago" }
      ids = filas.map { |f| f["id"] }
      assert_includes ids, report_expense_options(:opcion_pago).id
      refute_includes ids, report_expense_options(:opcion_tipo).id
    end
  end

  test "una categoria inexistente se rechaza nombrando las validas" do
    with_mcp_key do
      res = ReportExpenseOptionsListTool.call(server_context: ctx, category: "tipo de gasto")
      assert_tool_error res, "Error:"
      assert_tool_error res, "Tipo"
      assert_tool_error res, "Medio de pago"
      refute_equal "[]", tool_text(res)
    end
  end

  test "tolera espacios y mayusculas" do
    with_mcp_key do
      con_espacios = tool_json(ReportExpenseOptionsListTool.call(server_context: ctx, category: "  TIPO  "))
      canonico = tool_json(ReportExpenseOptionsListTool.call(server_context: ctx, category: "Tipo"))
      assert_equal canonico, con_espacios
    end
  end

  test "no adivina por parecido" do
    with_mcp_key do
      res = ReportExpenseOptionsListTool.call(server_context: ctx, category: "Medio")
      assert_tool_error res, "Error:"
    end
  end

  test "category en blanco se trata como sin filtro" do
    with_mcp_key do
      res = ReportExpenseOptionsListTool.call(server_context: ctx, category: "   ")
      filas = tool_json(res)
      assert_equal ReportExpenseOption.count, filas.size
    end
  end

  test "el schema declara las dos categorias como enum" do
    props = ReportExpenseOptionsListTool.input_schema.to_h[:properties][:category]
    assert_equal ["Tipo", "Medio de pago"], props[:enum]
    assert_includes props[:description], "type_identification_id"
    assert_includes props[:description], "payment_type_id"
  end
end

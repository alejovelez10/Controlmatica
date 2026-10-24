require "test_helper"

# Por donde entro cada gasto y cada reporte (paquete 17, 2026-10-23): "web" por
# defecto, "whatsapp" lo que crea el agente. Las listas lo muestran y filtran
# por el, y "Aceptar gastos" respeta ese filtro como los demas de la tabla.
class OrigenWhatsappTest < ActionDispatch::IntegrationTest
  include McpTestHelpers

  setup do
    @admin = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_real: 50_000.0, hour_cotizada: 60_000.0, eng_hours: 10.0)
  end

  def gasto(**extra)
    as_user(@admin) do
      ReportExpense.create!({
        cost_center_id: @centro.id, user_invoice_id: users(:ingeniero).id, invoice_name: "Hotel",
        invoice_date: "2026-06-10", description: "Alojamiento", invoice_number: "FE-#{SecureRandom.hex(3)}",
        identification: "900111222", invoice_value: 10_000, invoice_tax: 0, invoice_total: 10_000,
        omitir_comprobante_obligatorio: true
      }.merge(extra))
    end
  end

  def ids_de(respuesta)
    JSON.parse(respuesta.body)["data"].map { |fila| fila["id"] }
  end

  # ---- modelo y creacion ------------------------------------------------------

  test "lo que se crea sin decir nada queda como web" do
    assert_equal "web", gasto.origen
  end

  test "un origen que no existe no se guarda" do
    registro = gasto
    refute registro.update(origen: "fax")
  end

  test "lo que crean las tools desde el agente queda como whatsapp, y desde otro lado como web" do
    with_mcp_key do
      base = { cost_center_id: @centro.id, user_invoice_id: users(:ingeniero).id, invoice_name: "Peaje",
               invoice_date: "2026-06-10", invoice_total: 12_000, invoice_value: 12_000, currency: "COP",
               type_identification_id: report_expense_options(:opcion_tipo).id,
               payment_type_id: report_expense_options(:opcion_pago).id }
      desde_agente = ReportExpensesCreateTool.call(server_context: ctx(actor_phone: "+57 300 123 4567").merge(canal: "whatsapp"),
                                                   **base.merge(invoice_number: "WA-1"))
      desde_otro = ReportExpensesCreateTool.call(server_context: ctx(actor_phone: "+57 300 123 4567"),
                                                 **base.merge(invoice_number: "MCP-1"))

      assert_equal "whatsapp", ReportExpense.find(tool_json(desde_agente)["id"]).origen
      assert_equal "web", ReportExpense.find(tool_json(desde_otro)["id"]).origen
    end
  end

  # ---- gastos ----------------------------------------------------------------

  test "la lista de gastos trae el origen y filtra por el" do
    web = gasto
    whatsapp = gasto(origen: "whatsapp")
    sign_in_as @admin

    get get_report_expenses_path, params: { origen: "whatsapp" }
    assert_equal [whatsapp.id], ids_de(response)
    assert_equal "whatsapp", JSON.parse(response.body)["data"].first["origen"]

    get get_report_expenses_path, params: { origen: "web" }
    assert_includes ids_de(response), web.id
    refute_includes ids_de(response), whatsapp.id
  end

  # El de WhatsApp se crea primero: el orden por defecto (el mas nuevo arriba)
  # lo dejaria de segundo.
  test "la columna Origen de gastos se puede ordenar" do
    whatsapp = gasto(origen: "whatsapp")
    gasto
    sign_in_as @admin

    get get_report_expenses_path, params: { sort: "origen", dir: "desc" }
    assert_response :success
    assert_equal whatsapp.id, ids_de(response).first
  end

  # El peor caso: filtrar "WhatsApp" y aceptar en masa aceptaba tambien los de
  # la web, porque esta accion ignoraba los filtros nuevos de la tabla.
  test "Aceptar gastos con el filtro WhatsApp acepta solo los de WhatsApp" do
    web = gasto
    whatsapp = gasto(origen: "whatsapp")
    sign_in_as @admin

    patch update_filter_values_path, params: { scope: "all", origen: "whatsapp" }

    assert_response :success
    assert whatsapp.reload.is_acepted, "no acepto el de WhatsApp"
    refute web.reload.is_acepted, "acepto uno de la web que el filtro no mostraba"
  end

  test "Aceptar gastos tambien respeta el filtro de estado presupuestal de la tabla" do
    sin_partida = gasto
    excedido = gasto
    sin_partida.update_columns(budget_status: "sin_presupuesto")
    excedido.update_columns(budget_status: "excedido")
    sign_in_as @admin

    patch update_filter_values_path, params: { scope: "all", budget_status: "excedido" }

    assert excedido.reload.is_acepted
    refute sin_partida.reload.is_acepted, "acepto uno que el filtro de estado presupuestal no mostraba"
  end

  # ---- reportes --------------------------------------------------------------

  test "los reportes que crea el agente quedan como whatsapp y la lista filtra por origen" do
    with_mcp_key do
      base = { cost_center_id: @centro.id, report_date: "2026-09-08", working_time: 2.0 }
      desde_agente = ReportsCreateTool.call(server_context: ctx(actor_phone: "+57 300 123 4567").merge(canal: "whatsapp"), **base)
      desde_otro = ReportsCreateTool.call(server_context: ctx(actor_phone: "+57 300 123 4567"), **base)
      @por_whatsapp = Report.find(tool_json(desde_agente)["id"])
      @por_web = Report.find(tool_json(desde_otro)["id"])
    end
    assert_equal "whatsapp", @por_whatsapp.origen
    assert_equal "web", @por_web.origen

    sign_in_as @admin
    get "/get_reports", params: { origen: "whatsapp" }
    filas = JSON.parse(response.body)["data"]
    assert_equal [@por_whatsapp.id], filas.map { |f| f["id"] }
    assert_equal "whatsapp", filas.first["origen"]

    get "/get_reports", params: { sort: "origen", dir: "desc" }
    assert_equal "whatsapp", JSON.parse(response.body)["data"].first["origen"]
  end
end

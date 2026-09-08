# frozen_string_literal: true

require "test_helper"

# Creación de reportes de servicio por MCP (paquete quick/260908-h36).
#
# Los cuatro controles que aquí se verifican son de SERVIDOR, no de prompt:
# identidad de quien ejecuta (A), coherencia centro↔cliente↔contacto (B),
# rechazo de valores negativos (C) y validación estricta de report_date (D).
class ReportsCreateToolTest < ActiveSupport::TestCase
  include McpTestHelpers

  setup do
    @centro = cost_centers(:centro_con_viaticos)     # cliente_uno
    # Las fixtures de cost_centers no traen valores hora. Sin hour_real la tool
    # rechaza antes de crear nada; y sin hour_cotizada/eng_hours el
    # before_update `change_state` de CostCenter revienta con nil * nil cuando
    # el callback `coste_center_verify` de Report pone el centro en EJECUCION.
    # update_columns escribe SIN disparar callbacks: es la unica forma de dejar
    # el centro apto sin ejecutar el codigo que se esta probando.
    @centro.update_columns(hour_real: 50_000.0, hour_cotizada: 60_000.0, eng_hours: 10.0)

    @contacto_del_cliente = Contact.create!(name: "Contacto ACME", customer: customers(:cliente_uno))
    @contacto_ajeno       = Contact.create!(name: "Contacto BETA", customer: customers(:cliente_dos))
  end

  # Argumentos mínimos de un reporte válido.
  def base(**extra)
    { cost_center_id: @centro.id, report_date: "2026-09-08", working_time: 4.0,
      work_description: "Mantenimiento preventivo" }.merge(extra)
  end

  def crear(ctx_args = {}, **args)
    ReportsCreateTool.call(server_context: ctx(**ctx_args), **base(**args))
  end

  # --- No-regresión -----------------------------------------------------

  test "sin api key devuelve unauthorized" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        assert_tool_error crear({ api_key: "mala", actor_phone: "+57 300 123 4567" }), "Unauthorized"
      end
    end
  end

  test "centro de costo inexistente devuelve not found" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, cost_center_id: 999_999)
        assert_tool_error res, "Not found: cost_center"
      end
    end
  end

  test "cliente inexistente devuelve not found" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, customer_id: 999_999)
        assert_tool_error res, "Not found: customer"
      end
    end
  end

  test "usuario inexistente devuelve not found" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({}, report_execute_id: 999_999)
        assert_tool_error res, "Not found: user"
      end
    end
  end

  test "centro sin hour_real se rechaza" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({ actor_phone: "+57 300 123 4567" },
                    cost_center_id: cost_centers(:centro_sin_viaticos).id)
        assert_tool_error res, "valor hora"
      end
    end
  end

  test "centro sin cliente se rechaza" do
    @centro.update_columns(customer_id: nil)
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({ actor_phone: "+57 300 123 4567" })
        assert_tool_error res, "no tiene cliente asociado"
      end
    end
  end

  # --- Identidad (A) -----------------------------------------------------

  test "sin report_execute_id el reporte queda a nombre del actor del telefono" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" })
      creado = Report.find(tool_json(res)["id"])
      assert_equal users(:ingeniero).id, creado.report_execute_id
      assert_equal users(:ingeniero).id, creado.user_id
    end
  end

  test "sin report_execute_id el reporte queda a nombre del actor del correo" do
    with_mcp_key do
      res = crear({ actor_email: users(:contador).email })
      creado = Report.find(tool_json(res)["id"])
      assert_equal users(:contador).id, creado.report_execute_id
    end
  end

  test "sin actor y sin report_execute_id NO crea nada" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        assert_tool_error crear, "no se pudo identificar"
      end
    end
  end

  test "un telefono repetido en dos usuarios NO crea nada" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        assert_tool_error crear({ actor_phone: "+57 300 999 9999" }), "no se pudo identificar"
      end
    end
  end

  test "con report_execute_id explicito y SIN actor por header si crea (compatibilidad del formulario web)" do
    with_mcp_key do
      res = crear({}, report_execute_id: users(:contador).id)
      creado = Report.find(tool_json(res)["id"])
      assert_equal users(:contador).id, creado.report_execute_id
      assert_equal users(:contador).id, creado.user_id
    end
  end

  test "sin actor NUNCA atribuye al Administrador" do
    with_mcp_key do
      antes = Report.where(report_execute_id: users(:admin).id).count
      crear
      assert_equal antes, Report.where(report_execute_id: users(:admin).id).count
    end
  end

  test "restaura User.current despues de crear" do
    User.current = nil
    with_mcp_key { crear({ actor_phone: "+57 300 123 4567" }) }
    assert_nil User.current
  end

  test "el mensaje de no-actor habla de reportes, no de gastos" do
    assert_includes ReportsCreateTool::NO_ACTOR_MESSAGE, "reporte"
    refute_includes ReportsCreateTool::NO_ACTOR_MESSAGE, "gasto"
  end

  # --- Fecha (D) -----------------------------------------------------------

  test "report_date basura rechaza con texto y no levanta excepcion" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = assert_nothing_raised { crear({ actor_phone: "+57 300 123 4567" }, report_date: "mañana") }
        assert_includes tool_text(res), "YYYY-MM-DD"
      end
    end
  end

  test "report_date en formato DD/MM/YYYY rechaza" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, report_date: "08/09/2026")
        assert_includes tool_text(res), "YYYY-MM-DD"
      end
    end
  end

  test "report_date con un dia que no existe rechaza" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, report_date: "2026-02-30")
        assert_includes tool_text(res), "YYYY-MM-DD"
      end
    end
  end

  test "report_date valida se guarda como fecha" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" })
      creado = Report.find(tool_json(res)["id"])
      assert_equal Date.new(2026, 9, 8), creado.report_date
    end
  end

  # --- Coherencia (B) -------------------------------------------------------

  test "customer_id omitido sale del centro de costo" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" })
      creado = Report.find(tool_json(res)["id"])
      assert_equal customers(:cliente_uno).id, creado.customer_id
    end
  end

  test "customer_id que coincide con el del centro se acepta" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" }, customer_id: customers(:cliente_uno).id)
      assert Report.exists?(tool_json(res)["id"])
    end
  end

  test "customer_id de otro cliente rechaza y no crea" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, customer_id: customers(:cliente_dos).id)
        assert_tool_error res, "ACME"
        assert_tool_error res, customers(:cliente_dos).id.to_s
      end
    end
  end

  test "contact_id del cliente del centro se acepta" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" }, contact_id: @contacto_del_cliente.id)
      creado = Report.find(tool_json(res)["id"])
      assert_equal @contacto_del_cliente.id, creado.contact_id
    end
  end

  test "contact_id de otro cliente rechaza y no crea" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, contact_id: @contacto_ajeno.id)
        assert_tool_error res, "ACME"
      end
    end
  end

  test "contact_id inexistente rechaza y no crea" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, contact_id: 999_999)
        assert_tool_error res, "no pertenece al cliente"
      end
    end
  end

  # --- Negativos (C) ---------------------------------------------------------

  test "working_time negativo rechaza y no crea" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, working_time: -5)
        assert_tool_error res, "working_time"
      end
    end
  end

  test "displacement_hours negativo rechaza y no crea" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, displacement_hours: -1)
        assert_tool_error res, "displacement_hours"
      end
    end
  end

  test "viatic_value negativo rechaza y no crea" do
    with_mcp_key do
      assert_no_difference("Report.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, viatic_value: -100)
        assert_tool_error res, "viatic_value"
      end
    end
  end

  test "cero no es negativo y sigue creando" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" },
                  working_time: 0, displacement_hours: 0, viatic_value: 0)
      creado = Report.find(tool_json(res)["id"])
      assert_equal 0.0, creado.total_value
    end
  end

  # --- Contrato del schema ----------------------------------------------------

  test "el input_schema solo exige cost_center_id y report_date" do
    assert_equal %w[cost_center_id report_date], ReportsCreateTool.input_schema.to_h[:required]
  end

  test "el input_schema documenta report_execute_id como opcional" do
    assert_includes ReportsCreateTool.input_schema.to_h[:properties][:report_execute_id][:description], "opcional"
  end

  test "el input_schema documenta customer_id como opcional" do
    assert_includes ReportsCreateTool.input_schema.to_h[:properties][:customer_id][:description], "opcional"
  end

  test "la respuesta trae las KEYS de reports_list" do
    with_mcp_key do
      cuerpo = tool_json(crear({ actor_phone: "+57 300 123 4567" }))
      ReportsListTool::KEYS.each { |k| assert cuerpo.key?(k.to_s), "falta #{k}" }
    end
  end
end

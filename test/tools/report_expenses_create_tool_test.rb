# frozen_string_literal: true

require "test_helper"

# Creación de gastos por MCP (paquete 11, tareas 7 y 8).
#
# Los tres controles que aquí se verifican son de SERVIDOR y no de prompt:
# quién queda como responsable, qué campos puede escribir el llamador y qué pasa
# cuando el gasto viola una regla de negocio.
class ReportExpensesCreateToolTest < ActiveSupport::TestCase
  include McpTestHelpers

  setup do
    @centro = cost_centers(:centro_con_viaticos)
    @sin_partida = cost_centers(:centro_ajeno)
  end

  # Argumentos mínimos de un gasto válido.
  def base(**extra)
    { cost_center_id: @centro.id, invoice_name: "Hotel Dann", invoice_date: "2026-07-17",
      invoice_value: 100_000, invoice_tax: 19_000, invoice_total: 119_000 }.merge(extra)
  end

  def crear(ctx_args = {}, **args)
    ReportExpensesCreateTool.call(server_context: ctx(**ctx_args), **base(**args))
  end

  # Regla por defecto activa: las fixtures no traen ninguna a propósito, así que
  # cada test que necesite violaciones se la crea.
  def regla_default!(**attrs)
    as_user(users(:admin)) do
      ExpenseRule.create!({ name: "Regla de prueba", active: true, is_default: true,
                            check_duplicates: false }.merge(attrs))
    end
  end

  # --- Autorización y existencia -------------------------------------------

  test "sin api key devuelve unauthorized" do
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        assert_tool_error crear({ api_key: "mala", actor_phone: "+57 300 123 4567" }), "Unauthorized"
      end
    end
  end

  test "centro de costo inexistente devuelve not found" do
    with_mcp_key do
      res = ReportExpensesCreateTool.call(server_context: ctx(actor_phone: "+57 300 123 4567"),
                                          **base(cost_center_id: 999_999))
      assert_tool_error res, "Not found: cost_center"
    end
  end

  test "errores de validacion vuelven como texto Error" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" }, user_invoice_id: 999_999)
      assert_tool_error res, "Not found: user"
    end
  end

  # --- Actor ----------------------------------------------------------------

  test "crea el gasto atribuido al usuario del telefono" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" })
      creado = ReportExpense.find(tool_json(res)["id"])
      assert_equal users(:ingeniero).id, creado.user_invoice_id
      assert_equal users(:ingeniero).id, creado.user_id
    end
  end

  test "crea el gasto atribuido al usuario del correo" do
    with_mcp_key do
      res = crear({ actor_email: users(:contador).email })
      creado = ReportExpense.find(tool_json(res)["id"])
      assert_equal users(:contador).id, creado.user_invoice_id
    end
  end

  test "sin actor identificado NO crea el gasto" do
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        assert_tool_error crear, "no se pudo identificar"
      end
    end
  end

  test "un telefono repetido en dos usuarios NO crea el gasto" do
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        assert_tool_error crear({ actor_phone: "+57 300 999 9999" }), "no se pudo identificar"
      end
    end
  end

  test "sin actor pero con user_invoice_id explicito si crea" do
    with_mcp_key do
      # users(:contador) no tiene reglas asignadas: el gerente sí (fixtures del
      # paquete 14) y el guard de reglas taparía lo que este test mide.
      res = crear({}, user_invoice_id: users(:contador).id)
      creado = ReportExpense.find(tool_json(res)["id"])
      assert_equal users(:contador).id, creado.user_invoice_id
      assert_equal users(:contador).id, creado.user_id
    end
  end

  test "sin actor NUNCA atribuye al Administrador" do
    with_mcp_key do
      antes = ReportExpense.where(user_invoice_id: users(:admin).id).count
      crear
      assert_equal antes, ReportExpense.where(user_invoice_id: users(:admin).id).count
    end
  end

  test "MCP_STRICT_EXPENSE_ACTOR=false restaura el fallback" do
    with_mcp_key do
      with_env("MCP_STRICT_EXPENSE_ACTOR", "false") do
        res = crear
        creado = ReportExpense.find(tool_json(res)["id"])
        assert_equal users(:admin).id, creado.user_invoice_id
      end
    end
  end

  test "restaura User.current despues de crear" do
    User.current = nil
    with_mcp_key { crear({ actor_phone: "+57 300 123 4567" }) }
    assert_nil User.current
  end

  # --- Campos de moneda -----------------------------------------------------

  test "escribe los campos de moneda" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" },
                  currency: "USD", foreign_value: 120.0, foreign_tax: 22.8, foreign_total: 142.8,
                  exchange_rate: 4120.5, exchange_rate_date: "2026-07-17")
      creado = ReportExpense.find(tool_json(res)["id"])
      assert_equal "USD", creado.currency
      assert_equal 120.0.to_d, creado.foreign_value
      assert_equal 4120.5.to_d, creado.exchange_rate
      assert_equal Date.new(2026, 7, 17), creado.exchange_rate_date
    end
  end

  test "exchange_rate_source queda en trm_oficial si la tasa coincide con la cacheada" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" },
                  currency: "USD", foreign_value: 120.0, foreign_total: 120.0,
                  exchange_rate: 4120.5, exchange_rate_date: "2026-07-17")
      assert_equal "trm_oficial", ReportExpense.find(tool_json(res)["id"]).exchange_rate_source
    end
  end

  test "exchange_rate_source queda en manual si la tasa no coincide" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" },
                  currency: "USD", foreign_value: 120.0, foreign_total: 120.0,
                  exchange_rate: 3999.99, exchange_rate_date: "2026-07-17")
      assert_equal "manual", ReportExpense.find(tool_json(res)["id"]).exchange_rate_source
    end
  end

  test "exchange_rate_source queda nil en COP" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" })
      assert_nil ReportExpense.find(tool_json(res)["id"]).exchange_rate_source
    end
  end

  test "exchange_rate_source no es escribible desde los argumentos" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" },
                  currency: "USD", foreign_value: 120.0, foreign_total: 120.0,
                  exchange_rate: 3999.99, exchange_rate_date: "2026-07-17",
                  exchange_rate_source: "trm_oficial")
      assert_equal "manual", ReportExpense.find(tool_json(res)["id"]).exchange_rate_source
    end
  end

  # --- Campos del servidor, no escribibles ---------------------------------

  test "no se puede setear budget_status desde los argumentos" do
    with_mcp_key do
      res = ReportExpensesCreateTool.call(server_context: ctx(actor_phone: "+57 300 123 4567"),
                                          **base(cost_center_id: @sin_partida.id,
                                                 budget_status: "aprobado"))
      assert_equal "sin_presupuesto", ReportExpense.find(tool_json(res)["id"]).budget_status
    end
  end

  test "no se puede setear accounting_approved desde los argumentos" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" }, accounting_approved: true)
      assert_equal false, ReportExpense.find(tool_json(res)["id"]).accounting_approved
    end
  end

  test "no se puede setear is_acepted desde los argumentos" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" }, is_acepted: true)
      assert_equal false, ReportExpense.find(tool_json(res)["id"]).is_acepted
    end
  end

  test "no se puede setear receipt_file desde los argumentos" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" }, receipt_file: "factura.pdf")
      assert_nil ReportExpense.find(tool_json(res)["id"]).receipt_file.file
    end
  end

  test "no se puede setear expense_budget_id desde los argumentos" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" },
                  expense_budget_id: expense_budgets(:activa_otro_usuario).id)
      creado = ReportExpense.find(tool_json(res)["id"])
      # El id que quedó es el que puso el servicio (la partida más antigua del
      # par), no el que mandó el llamador.
      assert_equal expense_budgets(:activa_ingeniero).id, creado.expense_budget_id
    end
  end

  test "no se puede setear last_user_edited_id desde los argumentos" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" }, last_user_edited_id: users(:gerente).id)
      refute_equal users(:gerente).id, ReportExpense.find(tool_json(res)["id"]).last_user_edited_id
    end
  end

  # --- Presupuesto ----------------------------------------------------------

  test "guarda con persist_with_evaluation! y devuelve budget_status aprobado" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" })
      cuerpo = tool_json(res)
      assert_equal "aprobado", cuerpo["budget_status"]
      # LO QUE ATRAPA LA REGRESIÓN: que el estado esté PERSISTIDO. Con el patrón
      # save + evaluate! + reload, esto valdría "sin_presupuesto".
      assert_equal "aprobado", ReportExpense.find(cuerpo["id"]).reload.budget_status
      assert_equal "Aprobado contra presupuesto.", cuerpo["budget_message"]
    end
  end

  test "devuelve budget_status excedido con su mensaje" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" }, invoice_value: 900_000, invoice_total: 900_000)
      cuerpo = tool_json(res)
      assert_equal "excedido", cuerpo["budget_status"]
      assert_includes cuerpo["budget_message"], "ATENCION"
    end
  end

  test "devuelve sin_presupuesto cuando no hay partida" do
    with_mcp_key do
      res = ReportExpensesCreateTool.call(server_context: ctx(actor_phone: "+57 300 123 4567"),
                                          **base(cost_center_id: @sin_partida.id))
      cuerpo = tool_json(res)
      assert_equal "sin_presupuesto", cuerpo["budget_status"]
      assert_includes cuerpo["budget_message"], "No hay partida presupuestal"
    end
  end

  test "el JSON de respuesta trae las 28 keys mas budget_message" do
    with_mcp_key do
      cuerpo = tool_json(crear({ actor_phone: "+57 300 123 4567" }))
      ReportExpensesListTool::KEYS.each { |k| assert cuerpo.key?(k.to_s), "falta #{k}" }
      assert cuerpo.key?("budget_message")
      assert cuerpo.key?("rule_violations")
    end
  end

  # --- Guard del motor de reglas (§7.5) ------------------------------------

  test "un gasto duplicado es rechazado por el motor de reglas" do
    regla_default!(check_duplicates: true)
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        res = crear({ actor_phone: "+57 300 123 4567" },
                    invoice_number: report_expenses(:one).invoice_number,
                    identification: report_expenses(:one).identification)
        cuerpo = tool_json(res)
        assert_equal "error", cuerpo["type"]
        assert_equal ["duplicate_invoice"], cuerpo["rule_violations"].map { |v| v["code"] }
      end
    end
  end

  test "un gasto sobre el tope de valor es rechazado por el motor de reglas" do
    regla_default!(max_invoice_value: 50_000)
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        res = crear({ actor_phone: "+57 300 123 4567" })
        cuerpo = tool_json(res)
        assert_equal "error", cuerpo["type"]
        assert_equal ["invoice_value_exceeded"], cuerpo["rule_violations"].map { |v| v["code"] }
        assert_includes cuerpo["next_step"], "confirm_rule_violations"
      end
    end
  end

  test "un comprobante vencido es rechazado por el motor de reglas" do
    regla_default!(max_invoice_age_days: 5)
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        res = crear({ actor_phone: "+57 300 123 4567" },
                    invoice_date: (Date.current - 60).to_s)
        assert_equal "error", tool_json(res)["type"]
      end
    end
  end

  test "con confirm_rule_violations la persona puede registrar igual y el gasto NO queda aprobado" do
    regla_default!(max_invoice_value: 50_000)
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" }, confirm_rule_violations: true)
      cuerpo = tool_json(res)
      creado = ReportExpense.find(cuerpo["id"])
      assert_equal ["invoice_value_exceeded"], creado.rule_violations.map { |v| v["code"] }
      # El paquete 14 manda: una violación no impide guardar, pero impide que
      # quede aprobado.
      refute_equal "aprobado", creado.budget_status
    end
  end

  test "sin violaciones el gasto se crea sin confirmacion" do
    regla_default!(max_invoice_value: 5_000_000)
    with_mcp_key do
      assert_difference("ReportExpense.count", 1) do
        assert_equal [], tool_json(crear({ actor_phone: "+57 300 123 4567" }))["rule_violations"]
      end
    end
  end
end

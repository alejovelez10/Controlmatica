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
    # type_identification_id va en la base porque el servidor lo exige (ver el
    # guard del tool): sin el, cada test de este archivo fallaria por una razon
    # ajena a lo que quiere probar.
    { cost_center_id: @centro.id, invoice_name: "Hotel Dann", invoice_date: "2026-07-17",
      invoice_value: 100_000, invoice_tax: 19_000, invoice_total: 119_000,
      type_identification_id: report_expense_options(:opcion_tipo).id }.merge(extra)
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

  # El gasto se pide con un valor que NO cabe en la partida, a proposito.
  #
  # Antes bastaba con crear el gasto normal y afirmar `false`, porque nada en el
  # sistema ponia `is_acepted` en true. Desde que existe la aceptacion automatica
  # (`ReportExpense#auto_accept_if_within_budget`) un gasto que cabe nace
  # aceptado, y esa version del test pasaba a medir otra cosa: no distinguia "el
  # argumento se ignoro" de "la regla de presupuesto lo acepto". Con un valor que
  # se pasa del cupo, la regla dice NO y el unico que podria poner `true` es el
  # argumento: si el assert falla, es porque el argumento colo.
  test "no se puede setear is_acepted desde los argumentos" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" },
                  is_acepted: true, invoice_value: 999_999_999, invoice_tax: 0,
                  invoice_total: 999_999_999)
      gasto = ReportExpense.find(tool_json(res)["id"])

      assert_equal ExpenseBudgetService::STATUS_EXCEDIDO, gasto.budget_status,
                   "el gasto tenia que quedar excedido para que este test mida lo que dice medir"
      assert_equal false, gasto.is_acepted
    end
  end

  # La contraparte del anterior: sin pasar `is_acepted` por argumento, un gasto
  # que SI cabe nace aceptado solo.
  test "un gasto que cabe en el presupuesto nace aceptado sin que nadie lo toque" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" })
      gasto = ReportExpense.find(tool_json(res)["id"])

      assert_equal ExpenseBudgetService::STATUS_APROBADO, gasto.budget_status
      assert gasto.is_acepted, "un gasto aprobado presupuestalmente debe nacer aceptado"
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

  # --- Ids de opción (categoría) --------------------------------------------

  test "type_identification_id inexistente NO crea el gasto" do
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, type_identification_id: 999_999)
        assert_tool_error res, "Error:"
        assert_tool_error res, "type_identification_id"
        assert_tool_error res, "Tipo"
      end
    end
  end

  test "payment_type_id inexistente NO crea el gasto" do
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, payment_type_id: 999_999)
        assert_tool_error res, "Error:"
        assert_tool_error res, "payment_type_id"
        assert_tool_error res, "Medio de pago"
      end
    end
  end

  test "type_identification_id con un id que existe pero es de la otra categoria NO crea el gasto" do
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        res = crear({ actor_phone: "+57 300 123 4567" },
                    type_identification_id: report_expense_options(:opcion_pago).id)
        assert_tool_error res, "Error:"
        assert_tool_error res, "type_identification_id"
        assert_tool_error res, "Tipo"
        assert_tool_error res, "Medio de pago"
      end
    end
  end

  test "payment_type_id con un id que existe pero es de la otra categoria NO crea el gasto" do
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        res = crear({ actor_phone: "+57 300 123 4567" },
                    payment_type_id: report_expense_options(:opcion_tipo).id)
        assert_tool_error res, "Error:"
        assert_tool_error res, "payment_type_id"
        assert_tool_error res, "Medio de pago"
        assert_tool_error res, "Tipo"
      end
    end
  end

  test "con los ids correctos si crea" do
    with_mcp_key do
      res = crear({ actor_phone: "+57 300 123 4567" },
                  type_identification_id: report_expense_options(:opcion_tipo).id,
                  payment_type_id: report_expense_options(:opcion_pago).id)
      creado = ReportExpense.find(tool_json(res)["id"])
      assert_equal report_expense_options(:opcion_tipo).id, creado.type_identification_id
      assert_equal report_expense_options(:opcion_pago).id, creado.payment_type_id
    end
  end

  test "omitir los dos ids sigue creando" do
    with_mcp_key do
      assert_difference("ReportExpense.count", 1) do
        crear({ actor_phone: "+57 300 123 4567" })
      end
    end
  end

  test "el rechazo de id de opcion ocurre antes del motor de reglas" do
    regla_default!(max_invoice_value: 50_000)
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        res = crear({ actor_phone: "+57 300 123 4567" }, type_identification_id: 999_999)
        assert_tool_error res, "type_identification_id"
        refute_includes tool_text(res), "rule_violations"
      end
    end
  end

  test "el schema nombra la categoria de cada id" do
    props = ReportExpensesCreateTool.input_schema.to_h[:properties]
    assert_includes props[:type_identification_id][:description], "Tipo"
    assert_includes props[:type_identification_id][:description], "report_expense_options_list"
    assert_includes props[:payment_type_id][:description], "Medio de pago"
  end

  # --- el tipo de gasto es obligatorio, y lo exige el SERVIDOR ---------------
  # 2026-09-09: el body ya lo pedia y el modelo lo salteo igual — pidio la lista
  # de opciones, la recibio entera y guardo sin preguntarle nada a la persona.

  test "sin type_identification_id NO crea nada" do
    with_mcp_key do
      assert_no_difference("ReportExpense.count") do
        res = ReportExpensesCreateTool.call(
          server_context: ctx(actor_phone: "+57 300 123 4567"),
          **base.except(:type_identification_id)
        )
        assert_tool_error res, "type_identification_id"
      end
    end
  end

  test "el rechazo por tipo faltante manda a report_expense_options_list" do
    with_mcp_key do
      res = ReportExpensesCreateTool.call(
        server_context: ctx(actor_phone: "+57 300 123 4567"),
        **base.except(:type_identification_id)
      )
      texto = res.content.first[:text]
      assert_includes texto, "report_expense_options_list"
      assert_includes texto, "Tipo"
    end
  end

  test "con un type_identification_id valido si crea" do
    with_mcp_key do
      assert_difference("ReportExpense.count", 1) do
        crear({ actor_phone: "+57 300 123 4567" })
      end
    end
  end

  test "el input_schema declara type_identification_id como requerido" do
    assert_includes ReportExpensesCreateTool.input_schema.to_h[:required],
                    "type_identification_id"
  end
end

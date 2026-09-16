# frozen_string_literal: true

require "test_helper"

# expense_rules_validate y expense_rules_list (paquete 11 tarea 12 y paquete 14
# tarea 7). La propiedad más importante de las dos: NO PERSISTEN NADA.
class ExpenseRulesValidateToolTest < ActiveSupport::TestCase
  include McpTestHelpers

  setup do
    @centro = cost_centers(:centro_con_viaticos)

    # Los gastos preexistentes de las fixtures representan cupo YA EJECUTADO.
    # Desde 2026-09-10 solo lo ACEPTADO consume (ExpenseBudgetService.consumidores)
    # y las fixtures del paquete 01 nacen sin aceptar: sin esto el disponible del
    # par sube y el escenario de este archivo deja de ser el que se queria medir.
    ReportExpense.update_all(is_acepted: true)
  end

  def regla_default!(**attrs)
    as_user(users(:admin)) do
      ExpenseRule.create!({ name: "Regla de prueba", active: true, is_default: true,
                            check_duplicates: false }.merge(attrs))
    end
  end

  def validar(**args)
    ExpenseRulesValidateTool.call(server_context: ctx(**(args.delete(:ctx_args) || {})),
                                  cost_center_id: @centro.id,
                                  user_invoice_id: users(:ingeniero).id,
                                  invoice_date: Date.current.to_s,
                                  invoice_value: 100_000, invoice_total: 119_000, **args)
  end

  test "sin violaciones devuelve ok true" do
    with_mcp_key do
      cuerpo = tool_json(validar)
      assert_equal true, cuerpo["ok"]
      assert_equal 0, cuerpo["blocking_count"]
    end
  end

  test "una violacion bloqueante deja ok en false" do
    regla_default!(max_invoice_value: 50_000)
    with_mcp_key do
      cuerpo = tool_json(validar)
      assert_equal false, cuerpo["ok"]
      assert_equal 1, cuerpo["blocking_count"]
      assert_equal "invoice_value_exceeded", cuerpo["violations"].first["code"]
    end
  end

  # `blocking` SALE DEL SERVICIO Y NO ESTA CABLEADO. Hasta 2026-09-15 esta tool
  # escribia `blocking: true` en toda violacion determinista, porque todas
  # frenaban; con el flag `mandatory` eso dejo de ser cierto y decirle al agente
  # que algo frena cuando no frena lo manda a pedir una confirmacion que ya no
  # existe, o a no registrar un gasto que si se podia registrar.
  test "una regla no obligatoria da blocking false y no cuenta como bloqueante" do
    regla_default!(max_invoice_value: 50_000, mandatory: false)
    with_mcp_key do
      cuerpo = tool_json(validar)

      # `ok` DE ESTA TOOL SIGNIFICA "SE PUEDE REGISTRAR", no "no se incumple
      # nada": ya se comportaba asi con el aviso de presupuesto, y una regla
      # blanda es exactamente eso, un aviso. Queda en true y la violacion viaja
      # igual en la lista para que el agente se lo cuente antes de crear.
      assert_equal true, cuerpo["ok"]
      assert_equal "invoice_value_exceeded", cuerpo["violations"].first["code"]
      assert_equal false, cuerpo["violations"].first["blocking"]
      assert_equal 0, cuerpo["blocking_count"]
      assert_equal 1, cuerpo["warning_count"]
    end
  end

  test "la advertencia de presupuesto no es bloqueante y deja ok en true" do
    with_mcp_key do
      cuerpo = tool_json(validar(invoice_value: 900_000, invoice_total: 900_000))
      assert_equal true, cuerpo["ok"]
      assert_equal 1, cuerpo["warning_count"]
      presupuesto = cuerpo["violations"].find { |v| v["rule"] == "presupuesto" }
      assert_equal false, presupuesto["blocking"]
      assert_includes presupuesto["message"], "excedido"
    end
  end

  test "no persiste nada" do
    regla_default!(max_invoice_value: 50_000)
    with_mcp_key do
      assert_no_difference("ReportExpense.count") { validar }
    end
  end

  test "incluye el bloque de presupuesto por defecto" do
    with_mcp_key do
      cuerpo = tool_json(validar)
      assert_equal "500000.0", cuerpo["budget"]["available"]
      assert_equal true, cuerpo["budget"]["has_budget"]
    end
  end

  test "include_budget false omite el bloque" do
    with_mcp_key { assert_nil tool_json(validar(include_budget: false))["budget"] }
  end

  test "sin user_invoice_id ni actor el bloque budget viene null y no falla" do
    with_mcp_key do
      cuerpo = tool_json(ExpenseRulesValidateTool.call(server_context: ctx,
                                                       cost_center_id: @centro.id,
                                                       invoice_value: 100_000))
      assert_nil cuerpo["budget"]
      assert_equal true, cuerpo["ok"]
    end
  end

  test "usa el actor cuando se omite user_invoice_id" do
    with_mcp_key do
      cuerpo = tool_json(ExpenseRulesValidateTool.call(
                           server_context: ctx(actor_phone: "+57 300 123 4567"),
                           cost_center_id: @centro.id, invoice_value: 100_000
                         ))
      assert_equal "500000.0", cuerpo["budget"]["available"]
    end
  end

  test "detecta duplicados sin guardar" do
    regla_default!(check_duplicates: true)
    with_mcp_key do
      cuerpo = tool_json(validar(invoice_number: report_expenses(:one).invoice_number,
                                 identification: report_expenses(:one).identification))
      assert_equal ["duplicate_invoice"], cuerpo["violations"].map { |v| v["code"] }
      assert_equal false, cuerpo["ok"]
    end
  end

  test "un gasto en dolares se compara en pesos y no con invoice_value vacio" do
    regla_default!(max_invoice_value: 100_000)
    with_mcp_key do
      # 120 USD a 4.120,5 = 494.460 COP: supera el tope de 100.000 aunque el
      # llamador no haya mandado invoice_value.
      cuerpo = tool_json(ExpenseRulesValidateTool.call(
                           server_context: ctx, cost_center_id: @centro.id,
                           user_invoice_id: users(:ingeniero).id,
                           invoice_date: Date.current.to_s,
                           currency: "USD", foreign_value: 120, foreign_total: 120,
                           exchange_rate: 4120.5
                         ))
      assert_equal ["invoice_value_exceeded"], cuerpo["violations"].map { |v| v["code"] }
    end
  end

  test "devuelve las instrucciones de texto para que las aplique el agente" do
    regla_default!(agent_instructions: "No se aceptan licores.")
    with_mcp_key do
      assert_includes tool_json(validar)["agent_instructions"], "licores"
    end
  end

  test "centro inexistente devuelve not found" do
    with_mcp_key do
      assert_tool_error ExpenseRulesValidateTool.call(server_context: ctx, cost_center_id: 999_999),
                        "Not found: cost_center"
    end
  end

  test "sin api key devuelve unauthorized" do
    with_mcp_key { assert_tool_error validar(ctx_args: { api_key: "mala" }), "Unauthorized" }
  end

  # --- expense_rules_list ---------------------------------------------------

  test "list devuelve las reglas aplicables y los limites resueltos" do
    with_mcp_key do
      cuerpo = tool_json(ExpenseRulesListTool.call(server_context: ctx, user_id: users(:gerente).id))
      assert_equal ["Regla directivos", "Regla directivos estricta"].sort,
                   cuerpo["rules"].map { |r| r["name"] }.sort
      # Gana la más restrictiva de cada límite por separado.
      assert_equal 15, cuerpo["limits"]["max_invoice_age_days"]
      assert_equal "2000000.0", cuerpo["limits"]["max_invoice_value"]
    end
  end

  test "list usa el actor si se omite user_id" do
    with_mcp_key do
      cuerpo = tool_json(ExpenseRulesListTool.call(server_context: ctx(actor_phone: "+57 300 123 4567")))
      assert_equal users(:ingeniero).id, cuerpo["user_id"]
    end
  end

  test "list sin actor devuelve el mensaje de identificacion" do
    with_mcp_key { assert_tool_error ExpenseRulesListTool.call(server_context: ctx), "no se pudo identificar" }
  end

  test "list de una persona sin reglas devuelve limites vacios" do
    with_mcp_key do
      cuerpo = tool_json(ExpenseRulesListTool.call(server_context: ctx, user_id: users(:contador).id))
      assert_equal [], cuerpo["rules"]
      assert_nil cuerpo["limits"]["max_invoice_value"]
    end
  end
end

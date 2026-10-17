# frozen_string_literal: true

require "test_helper"

# El agente de WhatsApp y las reglas por tipo y por persona (2026-10-14).
#
# Por WhatsApp el agente sabe el tipo de gasto que eligio, pero el servidor es
# quien decide: la validacion tiene que filtrar las reglas por ese tipo, el
# listado tiene que decir que tipos tiene prohibidos la persona, y el create
# tiene que rechazar un tipo prohibido aunque el agente no haya preguntado.
class ExpenseRulesAlcanceToolTest < ActiveSupport::TestCase
  include McpTestHelpers

  setup do
    @centro = cost_centers(:centro_con_viaticos)
    @ingeniero = users(:ingeniero)
    @representacion = ReportExpenseOption.create!(name: "Representación", category: "Tipo",
                                                  user_id: users(:admin).id)
    @alimentacion = report_expense_options(:opcion_tipo)
    ExpenseRule.update_all(active: false)
  end

  def regla(included_types: [], excluded_types: [], **attrs)
    as_user(users(:admin)) do
      r = ExpenseRule.new({ name: "Regla #{SecureRandom.hex(3)}", active: true,
                            applies_to_all_roles: true, check_duplicates: false }.merge(attrs))
      r.included_types = included_types
      r.excluded_types = excluded_types
      r.save!
      r
    end
  end

  def validar(**args)
    ExpenseRulesValidateTool.call(server_context: ctx, cost_center_id: @centro.id,
                                  user_invoice_id: @ingeniero.id, invoice_date: Date.current.to_s,
                                  invoice_value: 10_000, invoice_total: 10_000,
                                  include_budget: false, **args)
  end

  test "validar con el tipo prohibido devuelve una violacion que frena" do
    regla(name: "Representación solo directivos", prohibits_expense: true,
          included_types: [@representacion])

    with_mcp_key do
      cuerpo = tool_json(validar(type_identification_id: @representacion.id))
      assert_equal false, cuerpo["ok"]
      v = cuerpo["violations"].first
      assert_equal "expense_prohibited", v["code"]
      assert_equal true, v["blocking"]
      assert_equal "Representación solo directivos", v["rule"]
    end
  end

  test "validar con otro tipo no trae la prohibicion" do
    regla(prohibits_expense: true, included_types: [@representacion])

    with_mcp_key do
      assert_equal true, tool_json(validar(type_identification_id: @alimentacion.id))["ok"]
    end
  end

  # Las instrucciones que recibe el agente ya vienen filtradas por el tipo: con
  # "Excepto: Representación", en un gasto de representacion no hay texto de
  # licor que aplicar.
  test "las instrucciones de una regla excluida para el tipo no llegan al agente" do
    regla(excluded_types: [@representacion], agent_instructions: "No se aceptan bebidas alcohólicas.")

    with_mcp_key do
      assert_nil tool_json(validar(type_identification_id: @representacion.id))["agent_instructions"].presence
      assert_match "alcohólicas",
                   tool_json(validar(type_identification_id: @alimentacion.id))["agent_instructions"]
    end
  end

  # Dos prohibiciones con el mismo codigo, una obligatoria y otra no: cada una
  # tiene que salir con su propio `blocking`.
  test "una prohibicion blanda no sale como bloqueante por culpa de otra dura" do
    regla(name: "Dura", prohibits_expense: true, included_types: [@representacion])
    regla(name: "Blanda", prohibits_expense: true, mandatory: false, included_types: [@representacion])

    with_mcp_key do
      por_regla = tool_json(validar(type_identification_id: @representacion.id))["violations"]
                  .to_h { |v| [v["rule"], v["blocking"]] }
      assert_equal({ "Dura" => true, "Blanda" => false }, por_regla)
    end
  end

  test "el listado dice que tipos tiene prohibidos la persona" do
    regla(prohibits_expense: true, included_types: [@representacion])

    with_mcp_key do
      cuerpo = tool_json(ExpenseRulesListTool.call(server_context: ctx, user_id: @ingeniero.id))
      assert_equal [{ "id" => @representacion.id, "name" => "Representación" }], cuerpo["prohibited_types"]
      assert_equal ["Representación"], cuerpo["rules"].first["prohibited_types"]
    end
  end

  test "crear un gasto de un tipo prohibido lo rechaza y no guarda nada" do
    regla(prohibits_expense: true, included_types: [@representacion])

    with_mcp_key do
      assert_no_difference -> { ReportExpense.count } do
        res = ReportExpensesCreateTool.call(
          server_context: ctx(actor_email: @ingeniero.email), cost_center_id: @centro.id,
          invoice_name: "Restaurante", invoice_date: Date.current.to_s, invoice_value: 10_000,
          invoice_tax: 0, invoice_total: 10_000, type_identification_id: @representacion.id
        )
        cuerpo = tool_json(res)
        assert_equal "error", cuerpo["type"]
        assert_match "Representación", cuerpo["message"].join
      end
    end
  end
end

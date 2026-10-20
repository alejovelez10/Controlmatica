# frozen_string_literal: true

require "test_helper"

# El veredicto del agente sobre las reglas en texto libre llega al crear por MCP
# (paquete 17). Antes la tool no lo recibia y una regla obligatoria de ese tipo
# no frenaba nada por WhatsApp (adenda D de ESTADO.md, puerta 3).
class ReportExpensesCreatePolicyTest < ActiveSupport::TestCase
  include McpTestHelpers

  setup do
    @centro = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
    ExpenseRule.update_all(active: false)
  end

  def regla!(mandatory:)
    as_user(users(:admin)) do
      ExpenseRule.create!(name: "Sin licor", active: true, applies_to_all_roles: true, check_duplicates: false,
                          mandatory: mandatory, agent_instructions: "No se aceptan bebidas alcohólicas.")
    end
  end

  def crear(**extra)
    with_mcp_key do
      ReportExpensesCreateTool.call(
        server_context: ctx(actor_phone: "+57 300 123 4567"),
        cost_center_id: @centro.id, invoice_name: "Bar La Esquina", invoice_date: Date.current.iso8601,
        invoice_value: 50_000, invoice_tax: 0, invoice_total: 50_000,
        type_identification_id: report_expense_options(:opcion_tipo).id, **extra
      )
    end
  end

  test "con una regla obligatoria, un veredicto false no deja registrar el gasto" do
    regla = regla!(mandatory: true)
    assert_no_difference -> { ReportExpense.count } do
      respuesta = crear(policy_compliant: false, policy_findings: [{ "rule_id" => regla.id, "reason" => "Incluye cerveza" }])
      assert_includes tool_text(respuesta), "Incluye cerveza"
    end
  end

  test "con una regla blanda, el veredicto false registra el gasto sin aprobar y con el motivo" do
    regla = regla!(mandatory: false)
    assert_difference -> { ReportExpense.count }, 1 do
      crear(policy_compliant: false, policy_findings: [{ "rule_id" => regla.id, "reason" => "Incluye cerveza" }])
    end
    assert_includes ReportExpense.order(:id).last.rule_violations.to_s, "Incluye cerveza"
  end

  test "sin veredicto se registra como antes" do
    regla!(mandatory: true)
    assert_difference -> { ReportExpense.count }, 1 do
      crear
    end
  end

  test "un veredicto true no frena" do
    regla!(mandatory: true)
    assert_difference -> { ReportExpense.count }, 1 do
      crear(policy_compliant: true, policy_findings: [])
    end
  end
end

require "test_helper"

# El mensaje de «Guardar» cuando cambiar al segundo aprobador mueve gastos en
# camino (2026-11-09). La lógica está en
# test/models/expense_rule_cambio_de_aprobador_test.rb.
class ExpenseRulesCambioDeAprobadorControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0, user_owner_id: users(:dueno_centro).id)
    ExpenseRule.update_all(active: false)
    @regla = as_user(@admin) do
      ExpenseRule.create!(name: "Montos altos", active: true, applies_to_all_roles: true, mandatory: false,
                          check_duplicates: false, max_invoice_value: 100_000, requires_second_approval: true,
                          second_approver_user: users(:gerente), user: @admin)
    end
    as_user(@admin) do
      ReportExpense.create!(omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro,
                            user_invoice: users(:ingeniero), invoice_name: "Proveedor",
                            invoice_date: Date.current, invoice_number: "FE-CC-1", identification: "900111222",
                            invoice_value: 150_000, invoice_tax: 0, invoice_total: 150_000)
    end
  end

  test "dice cuantos gastos pasaron al nuevo segundo aprobador" do
    sign_in_as @admin

    patch expense_rule_path(@regla), params: { requires_second_approval: true, second_approver_user_id: @admin.id }

    assert_response :success
    assert_match "1 gasto en camino pasó al nuevo segundo aprobador", response.parsed_body["success"]
  end

  test "sin cambiar al aprobador el mensaje es el de siempre" do
    sign_in_as @admin

    patch expense_rule_path(@regla), params: { name: "Montos muy altos", requires_second_approval: true,
                                               second_approver_user_id: users(:gerente).id }

    assert_response :success
    assert_equal "¡La regla fue actualizada con exito!", response.parsed_body["success"]
  end
end

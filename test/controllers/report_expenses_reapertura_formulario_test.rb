require "test_helper"

# Reapertura al editar, PROBADA COMO LA HACE LA PANTALLA (2026-10-17).
#
# Las pruebas del modelo (test/models/report_expense_reapertura_test.rb) editan
# con `update!` y solo el campo que cambian. El formulario de Gastos no: manda
# TODOS los campos, y los vacios como "" (ReportExpenseIndex.js, `handleSubmit`).
# Lo que se cuida aqui es que abrir un gasto aceptado y darle "Guardar" sin tocar
# nada no lo devuelva a "Creado".
class ReportExpensesReaperturaFormularioTest < ActionDispatch::IntegrationTest
  CAMPOS_DEL_FORMULARIO = %w[
    cost_center_id user_invoice_id invoice_name invoice_date description observations invoice_number
    identification invoice_type invoice_value invoice_tax invoice_total
    type_identification_id payment_type_id
    currency foreign_value foreign_tax foreign_total
    exchange_rate exchange_rate_date exchange_rate_source cop_manual_override
  ].freeze

  setup do
    @admin = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
  end

  # Un gasto aceptado con los campos de texto opcionales en nil, que es como
  # estan casi todos los historicos.
  def gasto_aceptado
    as_user(@admin) do
      ReportExpense.create!(user: @admin, cost_center: @centro, user_invoice: users(:ingeniero),
                            invoice_name: "Hotel del formulario", invoice_date: Date.new(2026, 6, 1),
                            invoice_number: "FE-F#{SecureRandom.hex(3)}", identification: "900111222",
                            invoice_value: 10_000.0, invoice_tax: 0.0, invoice_total: 10_000.0,
                            description: nil, observations: nil, invoice_type: nil,
                            operational_state: ReportExpense::STATE_ACEPTADO)
    end
  end

  # La fila tal como la recibe la tabla, y el formulario armado con ella igual
  # que `handleEdit` + `handleSubmit`: `row[k] || ""` y los vacios como "".
  def lo_que_manda_el_formulario(gasto, **cambios)
    get get_report_expenses_path, params: { q: gasto.invoice_number }
    fila = JSON.parse(response.body)["data"].find { |r| r["id"] == gasto.id }
    assert fila, "La tabla no devolvio el gasto"

    form = CAMPOS_DEL_FORMULARIO.to_h do |k|
      v = fila[k]
      [k, v.nil? || v == false || v == 0 || v == "" ? "" : v.to_s]
    end
    form["currency"] = fila["currency"].presence || "COP"
    form["cop_manual_override"] = fila["cop_manual_override"] ? "true" : "false"
    form.merge(cambios.transform_keys(&:to_s))
  end

  def guardar(gasto, **cambios)
    patch report_expense_path(gasto), params: lo_que_manda_el_formulario(gasto, **cambios)
    assert_equal "success", JSON.parse(response.body)["type"], response.body
    gasto.reload
  end

  test "guardar sin cambiar nada no devuelve a Creado un gasto aceptado" do
    sign_in_as @admin
    gasto = gasto_aceptado

    assert guardar(gasto).aceptado?, "Abrir y guardar sin tocar nada reabrio el gasto"
  end

  test "cambiar el valor desde el formulario lo devuelve a Creado" do
    sign_in_as @admin
    gasto = gasto_aceptado

    assert guardar(gasto, invoice_value: "90000", invoice_total: "90000").creado?
  end

  test "cambiar solo las observaciones tambien lo devuelve a Creado" do
    sign_in_as @admin
    gasto = gasto_aceptado

    assert guardar(gasto, observations: "Se corrige la nota").creado?
  end
end

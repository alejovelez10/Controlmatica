require "test_helper"

# La regla de antiguedad AL EDITAR, probada como la usa la pantalla
# (2026-10-19).
#
# El caso real: una factura de 31 dias registrada con una regla obligatoria de
# 60 entra sin problema; dos meses despues ya "tenia 92 dias" y el gasto no se
# podia ni abrir y guardar, porque el formulario manda todos los campos (el IVA
# 0 llega como "") y eso disparaba la validacion completa contra hoy. La
# antiguedad ahora se cuenta hasta el dia del registro y, al editar, solo frena
# si cambio la fecha (ExpenseRuleService.check_age).
class ReportExpensesAntiguedadAlEditarTest < ActionDispatch::IntegrationTest
  CAMPOS_DEL_FORMULARIO = %w[
    cost_center_id user_invoice_id invoice_name invoice_date description observations invoice_number
    identification invoice_type invoice_value invoice_tax invoice_total
    type_identification_id payment_type_id
    currency foreign_value foreign_tax foreign_total
    exchange_rate exchange_rate_date exchange_rate_source cop_manual_override
  ].freeze

  REGISTRO = Time.zone.local(2026, 8, 1, 10)
  DOS_MESES_DESPUES = Time.zone.local(2026, 10, 1, 10)

  setup do
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    @centro = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
  end

  def regla(**attrs)
    as_user(@admin) do
      ExpenseRule.create!({ name: "Antiguedad #{SecureRandom.hex(3)}", active: true, check_duplicates: false,
                            user: @admin, max_invoice_age_days: 60, mandatory: true }.merge(attrs))
                 .tap { |r| r.rols = [@ingeniero.rol] }
    end
  end

  # Factura del 1-jul registrada el 1-ago: 31 dias, dentro del plazo de 60.
  def gasto_registrado_a_tiempo(**attrs)
    travel_to(REGISTRO) do
      as_user(@admin) do
        ReportExpense.create!({ user: @admin, cost_center: @centro, user_invoice: @ingeniero,
                                invoice_name: "Hotel", invoice_date: Date.new(2026, 7, 1),
                                invoice_number: "FE-#{SecureRandom.hex(3)}", identification: "900111222",
                                invoice_value: 10_000.0, invoice_tax: 0.0, invoice_total: 10_000.0,
                                operational_state: ReportExpense::STATE_ACEPTADO }.merge(attrs))
      end
    end
  end

  # Igual que ReportExpensesReaperturaFormularioTest: la fila de la tabla
  # armada como `handleEdit` + `handleSubmit`.
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
    JSON.parse(response.body)
  end

  def assert_guarda(gasto, **cambios)
    respuesta = guardar(gasto, **cambios)
    assert_equal "success", respuesta["type"], respuesta.inspect
    gasto.reload
  end

  test "dos meses despues se puede abrir y guardar sin tocar nada" do
    regla
    gasto = gasto_registrado_a_tiempo

    travel_to(DOS_MESES_DESPUES) do
      sign_in_as @admin
      assert_empty assert_guarda(gasto).rule_violations
    end
  end

  test "dos meses despues se le puede corregir la descripcion y el valor" do
    regla
    gasto = gasto_registrado_a_tiempo

    travel_to(DOS_MESES_DESPUES) do
      sign_in_as @admin
      assert_guarda(gasto, description: "Hotel, segunda noche")
      assert_equal 12_000.0, assert_guarda(gasto, invoice_value: "12000", invoice_total: "12000").invoice_value
      assert_empty gasto.rule_violations
    end
  end

  test "correr la fecha fuera del plazo del registro si frena" do
    regla
    gasto = gasto_registrado_a_tiempo

    travel_to(DOS_MESES_DESPUES) do
      sign_in_as @admin
      # 70 dias antes del 1-ago.
      respuesta = guardar(gasto, invoice_date: "2026-05-23")

      assert_equal "error", respuesta["type"]
      assert_includes respuesta["message"].join(" "),
                      "El comprobante tenía 70 días cuando se registró el gasto y el máximo son 60"
      assert_equal Date.new(2026, 7, 1), gasto.reload.invoice_date
    end
  end

  # Aceptar desde la tabla tambien guarda el gasto y reescribe la foto de
  # reglas: contada hasta hoy, le aparecia una antiguedad que no tenia.
  test "aceptarlo dos meses despues no le anota una antiguedad que no tenia" do
    regla
    gasto = gasto_registrado_a_tiempo(operational_state: ReportExpense::STATE_CREADO)

    travel_to(DOS_MESES_DESPUES) do
      sign_in_as @admin
      patch "/update_state_report_expense/#{gasto.id}/aceptado"

      assert gasto.reload.aceptado?, response.body
      assert_empty gasto.rule_violations
    end
  end

  # Con una regla blanda el gasto se guardaba, pero la foto le anotaba la
  # antiguedad contada hasta hoy y el motivo de "no se aprueba".
  test "editarlo dos meses despues con una regla blanda no le anota antiguedad" do
    regla(mandatory: false)
    gasto = gasto_registrado_a_tiempo(operational_state: ReportExpense::STATE_CREADO)

    travel_to(DOS_MESES_DESPUES) do
      sign_in_as @admin
      assert_guarda(gasto, description: "Hotel, segunda noche")

      assert_empty gasto.rule_violations
      assert_not_includes gasto.budget_reason.to_s, "reglas de gasto"
    end
  end
end

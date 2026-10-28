require "test_helper"

# Las reglas que incumplio cada gasto, una fila por motivo, para el informe
# «Incumplen reglas» (2026-10-25), y el cotejo del comprobante visto desde el
# gasto: que se guarda, que no frena y que no se aprueba solo.
class ReportExpenseReglasAplicadasTest < ActiveSupport::TestCase
  setup do
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    @centro = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
    ExpenseRule.update_all(active: false)
  end

  def regla!(**attrs)
    as_user(@admin) do
      ExpenseRule.create!({ active: true, applies_to_all_roles: true, check_duplicates: false,
                            mandatory: false }.merge(attrs))
    end
  end

  def gasto!(**attrs)
    as_user(@admin) do
      ReportExpense.create!({ cost_center_id: @centro.id, user_invoice_id: @ingeniero.id, invoice_name: "Hotel",
                              invoice_date: Date.current, description: "Alojamiento",
                              invoice_number: "FE-#{SecureRandom.hex(3)}", identification: "900123456",
                              invoice_value: 700_000, invoice_tax: 0, invoice_total: 700_000,
                              type_identification_id: report_expense_options(:opcion_tipo).id,
                              omitir_comprobante_obligatorio: true }.merge(attrs))
    end
  end

  def lectura(total: "700000.0", **extra)
    { "estado" => "leido", "campos" => { "total" => total, "invoice_date" => Date.current.iso8601,
                                         "identification" => "900123456" }.merge(extra.stringify_keys) }
  end

  # --- Regla por regla -----------------------------------------------------

  test "cada regla se mide con su propio tope y la fila dice cual fue" do
    estricta = regla!(name: "Tope 500 mil", max_invoice_value: 500_000)
    regla!(name: "Tope un millon", max_invoice_value: 1_000_000)

    hits = gasto!.rule_hits

    assert_equal [estricta.id], hits.map(&:expense_rule_id)
    assert_equal "Tope 500 mil", hits.first.rule_name
    assert_equal "El valor supera el tope de $500.000", hits.first.message
  end

  test "al corregir el valor la regla sale del informe" do
    regla!(name: "Tope 500 mil", max_invoice_value: 500_000)
    registro = gasto!

    as_user(@admin) { registro.update!(invoice_value: 400_000, invoice_total: 400_000) }

    assert_empty registro.reload.rule_hits
  end

  # Aceptar es decidir sobre lo que se incumplio, no volver a medir el gasto
  # con las reglas de hoy.
  test "aceptar no reescribe las reglas incumplidas" do
    tope = regla!(name: "Tope 500 mil", max_invoice_value: 500_000)
    registro = gasto!
    as_user(@admin) { tope.update!(max_invoice_value: 900_000) }

    as_user(@admin) { registro.update!(operational_state: ReportExpense::STATE_ACEPTADO) }

    assert_equal ["Tope 500 mil"], registro.reload.rule_hits.map(&:rule_name)
  end

  test "lo que encontro la IA sigue en el informe despues de editar sin leer otra vez" do
    licor = regla!(name: "Sin licor", agent_instructions: "No se aceptan bebidas alcohólicas.")
    registro = gasto!(agent_policy_verdict: { compliant: false,
                                              findings: [{ rule_id: licor.id, message: "Incluye cerveza" }] })
    assert_equal ["Incluye cerveza"], registro.rule_hits.map(&:message)

    as_user(@admin) { ReportExpense.find(registro.id).update!(invoice_value: 650_000, invoice_total: 650_000) }

    assert_equal ["Incluye cerveza"], registro.reload.rule_hits.map(&:message)
  end

  test "las filas se van con el gasto y sobreviven a la regla" do
    tope = regla!(name: "Tope 500 mil", max_invoice_value: 500_000)
    registro = gasto!
    as_user(@admin) { tope.destroy! }

    fila = registro.rule_hits.reload.first
    assert_nil fila.expense_rule_id
    assert_equal "Tope 500 mil", fila.rule_name

    as_user(@admin) { registro.destroy! }
    assert_equal 0, ReportExpenseRuleHit.where(report_expense_id: registro.id).count
  end

  # --- Cotejo del comprobante ------------------------------------------------

  # Aunque la regla diga «Impedir guardar»: lo que se compara sale de una
  # lectura de IA y una foto movida no puede dejar a nadie sin registrar.
  test "un comprobante que no cuadra no frena, pero el gasto no se aprueba solo" do
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true, mandatory: true)

    registro = gasto!(lectura_del_comprobante: lectura(total: "650000.0"))

    assert registro.persisted?
    refute registro.aceptado?
    assert_equal "diferencias", registro.receipt_check["estado"]
    assert_equal ["El total del comprobante es $650.000 y se registró $700.000"],
                 registro.rule_hits.map(&:message)
    assert_equal [ExpenseRuleService::CODE_RECEIPT], registro.rule_hits.map(&:code)
    assert_includes registro.motivo_de_retencion, "El total del comprobante es $650.000"
  end

  test "un comprobante que cuadra no deja nada en el informe" do
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)

    registro = gasto!(lectura_del_comprobante: lectura)

    assert_equal "coincide", registro.receipt_check["estado"]
    assert_empty registro.rule_hits
    assert_empty registro.rule_violations
  end

  test "al editar se vuelve a comparar con la lectura guardada" do
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    registro = gasto!(lectura_del_comprobante: lectura(total: "650000.0"))

    as_user(@admin) { ReportExpense.find(registro.id).update!(invoice_value: 650_000, invoice_total: 650_000) }

    registro.reload
    assert_equal "coincide", registro.receipt_check["estado"]
    assert_empty registro.rule_hits
  end

  test "un comprobante nuevo que no cuadra reabre un gasto aceptado" do
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    registro = gasto!(lectura_del_comprobante: lectura)
    as_user(@admin) { registro.update!(operational_state: ReportExpense::STATE_ACEPTADO) }

    otro = ReportExpense.find(registro.id)
    otro.lectura_del_comprobante = lectura(total: "1.0")
    as_user(@admin) { otro.save! }

    otro.reload
    assert_equal ReportExpense::STATE_CREADO, otro.operational_state
    assert_equal ["El total del comprobante es $1 y se registró $700.000"], otro.rule_hits.map(&:message)
  end

  # Revision del 2026-10-25: subirle a un rechazado otro comprobante que
  # tampoco cuadra lo devolvia a «Creado» y borraba el motivo del rechazo.
  test "un comprobante nuevo que no cuadra no reabre un gasto rechazado" do
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    registro = gasto!(lectura_del_comprobante: lectura(total: "1.0"))
    as_user(@admin) do
      registro.rechazar(actor: @admin, motivo: "El comprobante no cuadra")
      registro.save!
    end

    otro = ReportExpense.find(registro.id)
    otro.lectura_del_comprobante = lectura(total: "2.0")
    as_user(@admin) { otro.save! }

    assert_equal ReportExpense::STATE_RECHAZADO, otro.reload.operational_state
    assert_equal "El comprobante no cuadra", otro.rejection_reason
  end

  test "quitarle el comprobante a un gasto aprobado lo reabre y queda en el informe" do
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    registro = gasto!(lectura_del_comprobante: lectura)
    as_user(@admin) { registro.update!(operational_state: ReportExpense::STATE_ACEPTADO) }

    otro = ReportExpense.find(registro.id)
    otro.remove_receipt_file = true
    as_user(@admin) { otro.save! }

    otro.reload
    assert_equal ReportExpense::STATE_CREADO, otro.operational_state
    assert_equal ["No se pudo verificar el comprobante: el gasto no tiene comprobante"], otro.rule_hits.map(&:message)
  end

  # La misma instancia guardada dos veces: la lectura del primer guardado no
  # puede reabrir el gasto en el segundo, que es la decision de aceptarlo.
  test "la lectura no se queda en memoria despues de guardar" do
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    registro = gasto!(lectura_del_comprobante: lectura(total: "1.0"))

    as_user(@admin) { registro.update!(operational_state: ReportExpense::STATE_ACEPTADO) }

    assert_nil registro.lectura_del_comprobante
    assert_equal ReportExpense::STATE_ACEPTADO, registro.reload.operational_state
  end

  # Con otro tipo aplican otras reglas: una fila de un tope que ya no rige
  # mostraba el gasto al filtrar por esa regla.
  test "cambiar el tipo recalcula todas las reglas del informe" do
    representacion = as_user(@admin) { ReportExpenseOption.create!(name: "Representación", category: "Tipo", user_id: @admin.id) }
    tope = as_user(@admin) do
      r = ExpenseRule.new(name: "Tope 500 mil", active: true, applies_to_all_roles: true, check_duplicates: false,
                          mandatory: false, max_invoice_value: 500_000)
      r.excluded_types = [representacion]
      r.save!
      r
    end
    registro = gasto!
    assert_equal [tope.id], registro.rule_hits.map(&:expense_rule_id)

    as_user(@admin) { ReportExpense.find(registro.id).update!(type_identification_id: representacion.id) }

    assert_empty registro.reload.rule_hits
  end

  test "un gasto que nadie leyo no se marca por el cotejo" do
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)

    registro = gasto!

    assert_empty registro.rule_hits
    assert_equal({}, registro.receipt_check)
  end
end

require "test_helper"

# Superficie de CONTABILIDAD y de COMPROBANTE en ReportExpense (paquete 06,
# tareas A4 y B2).
#
# Los gastos con `budget_status` distinto de "sin_presupuesto" y los que llevan
# comprobante se crean AQUI y no en test/fixtures/report_expenses.yml a
# proposito: ese archivo es del paquete 01 (§7.2) y ademas
# test/models/schema_gastos_ia_test.rb (paquete 02) afirma que NINGUNA fixture
# tiene budget_status != "sin_presupuesto" ni accounting_approved = true.
# Agregar las etiquetas alli pondria rojo un test ajeno.
class ReportExpenseAccountingTest < ActiveSupport::TestCase
  setup do
    @actor = users(:admin)
  end

  def crear_gasto(**overrides)
    as_user(@actor) do
      ReportExpense.create!({
        user: @actor,
        cost_center: cost_centers(:centro_con_viaticos),
        user_invoice: users(:ingeniero),
        invoice_name: "Hotel Contabilidad",
        invoice_date: Date.new(2026, 6, 1),
        description: "Alojamiento",
        invoice_number: "FE-A#{SecureRandom.hex(3)}",
        identification: "900111222",
        invoice_value: 100_000.0,
        invoice_tax: 19_000.0,
        invoice_total: 119_000.0
      }.merge(overrides))
    end
  end

  test "accounting_visible excluye excedido" do
    excedido = crear_gasto(budget_status: "excedido")

    refute_includes ReportExpense.accounting_visible, excedido
  end

  test "accounting_visible incluye sin_presupuesto y aprobado" do
    # Garantia de §2.3: la pantalla de Contabilidad NO arranca vacia. El
    # historico (sin_presupuesto) es la inmensa mayoria de los 5.008 gastos.
    sin_presupuesto = crear_gasto(budget_status: "sin_presupuesto")
    aprobado = crear_gasto(budget_status: "aprobado")

    assert_includes ReportExpense.accounting_visible, sin_presupuesto
    assert_includes ReportExpense.accounting_visible, aprobado
  end

  test "accounting_pending excluye los ya aprobados" do
    gasto = crear_gasto
    assert_includes ReportExpense.accounting_pending, gasto

    as_user(@actor) { gasto.update!(accounting_approved: true) }

    refute_includes ReportExpense.accounting_pending, gasto
    assert_includes ReportExpense.accounting_visible, gasto
  end

  test "accounting_pending tampoco incluye un excedido sin aprobar" do
    excedido = crear_gasto(budget_status: "excedido")

    refute_includes ReportExpense.accounting_pending, excedido
  end

  test "accounting_state_label" do
    assert_equal "Pendiente", ReportExpense.new(accounting_approved: false).accounting_state_label
    assert_equal "Aprobado", ReportExpense.new(accounting_approved: true).accounting_state_label
  end

  test "receipt_file_url es nil sin comprobante" do
    assert_nil report_expenses(:one).receipt_file_url
  end

  test "receipt_file_url devuelve la url con comprobante" do
    gasto = crear_gasto
    gasto.receipt_file = upload_fixture("comprobante.pdf")
    as_user(@actor) { gasto.save! }

    assert_match(/comprobante\.pdf/, gasto.reload.receipt_file_url)
  end

  test "el default de accounting_approved es false" do
    refute ReportExpense.new.accounting_approved
  end

  test "accounting_approved_by es opcional y apunta a un usuario" do
    gasto = crear_gasto
    assert_nil gasto.accounting_approved_by

    as_user(@actor) { gasto.update!(accounting_approved_by: users(:contador)) }

    assert_equal users(:contador), gasto.reload.accounting_approved_by
  end

  test "editar el comprobante deja RegisterEdit" do
    gasto = crear_gasto

    assert_difference "RegisterEdit.count", 1 do
      gasto.receipt_file = upload_fixture("comprobante.pdf")
      as_user(@actor) { gasto.save! }
    end

    assert_match "Comprobante", RegisterEdit.last.description
  end
end

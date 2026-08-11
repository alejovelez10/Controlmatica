require "test_helper"

# UNICA excepcion al dueño unico de app/tools/ (00-ARQUITECTURA 7.2 y 7.7): el
# paquete 06 agrega las claves 27 y 28 de ReportExpensesListTool::KEYS, y nada
# mas de ese directorio.
#
# El criterio compartido final (KEYS.size == 28) TODAVIA no se puede afirmar:
# faltan las claves 17-19 (budget_status, budget_reason, expense_budget_id), que
# las agrega el paquete 11. Hoy son 25. Este test afirma lo que si es verificable
# ahora: que las dos claves de este paquete estan, al final, en ese orden, y que
# no se toco ninguna clave ajena.
class ReportExpensesListToolAccountingKeysTest < ActiveSupport::TestCase
  CLAVES_DE_CONTABILIDAD = %i[accounting_approved receipt_file_url].freeze

  test "las 2 claves del paquete 06 estan al final y en el orden canonico de 7.7" do
    claves = ReportExpensesListTool::KEYS

    assert_equal CLAVES_DE_CONTABILIDAD, claves.last(2)
    assert_equal claves.uniq, claves, "una clave duplicada rompe el criterio compartido de 7.7"
    assert claves.frozen?
  end

  test "no se agrego ninguna clave que no sea de este paquete" do
    # 16 originales + 3 presupuestales (paquete 11) + 7 de moneda (05) + 2 de
    # contabilidad (06). ACTUALIZADO POR EL PAQUETE 11 al mergear sus claves
    # 17-19: este es el criterio compartido FINAL de 7.7, el que los tres
    # paquetes prometieron.
    assert_equal 28, ReportExpensesListTool::KEYS.size
  end

  test "el serializador MCP resuelve las 2 claves contra un gasto con comprobante" do
    gasto = as_user(users(:admin)) do
      ReportExpense.create!(
        cost_center: cost_centers(:centro_con_viaticos),
        user_invoice: users(:ingeniero),
        user: users(:admin),
        invoice_name: "Gasto con comprobante",
        invoice_date: Date.new(2026, 7, 17),
        description: "Alojamiento",
        invoice_number: "MCP-CONTA-1",
        identification: "900111222",
        invoice_value: 100_000.0
      )
    end
    gasto.receipt_file = upload_fixture("comprobante.pdf")
    as_user(users(:admin)) { gasto.save! }

    fila = Mcp::Serialize.record(gasto.reload, ReportExpensesListTool::KEYS)

    assert fila.key?(:accounting_approved)
    assert fila.key?(:receipt_file_url)
    refute fila[:accounting_approved]
    assert_match(/comprobante\.pdf/, fila[:receipt_file_url])
  end

  test "receipt_file_url sale nulo cuando el gasto no tiene comprobante" do
    fila = Mcp::Serialize.record(report_expenses(:one), ReportExpensesListTool::KEYS)

    assert_nil fila[:receipt_file_url]
  end
end

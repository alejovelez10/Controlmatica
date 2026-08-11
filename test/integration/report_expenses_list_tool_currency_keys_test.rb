require "test_helper"

# UNICA excepcion al dueño unico de app/tools/ (00-ARQUITECTURA 7.2 y 7.7):
# este paquete agrega las claves 20-26 (moneda) de
# ReportExpensesListTool::KEYS, y nada mas de ese directorio.
#
# Este test cubre SOLO esa aportacion. El criterio compartido final
# (KEYS.size == 28) no se puede afirmar todavia: las claves 17-19 las agrega el
# paquete 11 y las 27-28 el 06, y los dos se mergean despues de este. Afirmar
# 28 aqui fallaria siempre y no probaria nada.
class ReportExpensesListToolCurrencyKeysTest < ActiveSupport::TestCase
  CLAVES_DE_MONEDA = %i[currency foreign_value foreign_tax foreign_total
                        exchange_rate exchange_rate_date exchange_rate_source].freeze

  CLAVES_ORIGINALES = %i[id cost_center_id user_invoice_id invoice_name invoice_date
                         invoice_number invoice_type invoice_value invoice_tax invoice_total
                         description identification type_identification_id payment_type_id
                         is_acepted created_at].freeze

  test "las 7 claves de moneda estan y en el orden canonico de 7.7" do
    claves = ReportExpensesListTool::KEYS

    assert_equal CLAVES_DE_MONEDA, claves.last(7)
    # Contiguas: si otro paquete intercala una clave suya en medio, el orden
    # canonico de 7.7 deja de cumplirse y este test lo dice.
    posiciones = CLAVES_DE_MONEDA.map { |k| claves.index(k) }
    assert_equal posiciones.first.upto(posiciones.last).to_a, posiciones
  end

  test "no se borro ni se reordeno ninguna clave ajena" do
    claves = ReportExpensesListTool::KEYS

    assert_equal CLAVES_ORIGINALES, claves.first(16)
    assert_equal claves.uniq, claves, "una clave duplicada rompe el criterio compartido de 7.7"
    assert claves.frozen?
  end

  test "el serializador MCP resuelve las 7 claves contra un gasto en USD" do
    gasto = as_user(users(:admin)) do
      ReportExpense.create!(
        cost_center: cost_centers(:centro_con_viaticos),
        user_invoice: users(:ingeniero),
        user: users(:admin),
        invoice_name: "Proveedor extranjero",
        invoice_date: Date.new(2026, 7, 17),
        description: "Servicio en el exterior",
        invoice_number: "MCP-001",
        identification: "900111222",
        currency: "USD", foreign_value: 120, foreign_tax: 22.80, exchange_rate: 4120.5
      )
    end

    fila = Mcp::Serialize.record(gasto.reload, ReportExpensesListTool::KEYS)

    CLAVES_DE_MONEDA.each { |clave| assert fila.key?(clave), "falta #{clave} en la salida MCP" }
    assert_equal "USD", fila[:currency]
    assert_equal BigDecimal("4120.5"), fila[:exchange_rate]
    # invoice_value sale en PESOS, no en dolares: es la misma columna que suma
    # el centro de costos.
    assert_equal 494_460.0, fila[:invoice_value]
  end
end

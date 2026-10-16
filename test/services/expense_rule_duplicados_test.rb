require "test_helper"

# Viaticos y numeros de relleno en la regla de duplicados (2026-10-14).
#
# El reclamo del cliente: "el numero de factura cuando es un viatico, si esta
# repetido porque ponen N/A o el numero de cedula, no la deja cargar". Un
# viatico no tiene factura, asi que el segundo viatico de la misma persona
# chocaba con el primero.
class ExpenseRuleDuplicadosTest < ActiveSupport::TestCase
  setup do
    @admin     = users(:admin)
    @ingeniero = users(:ingeniero)
    @centro    = cost_centers(:centro_con_viaticos)
    @viaticos  = report_expense_options(:opcion_viaticos)
    @alimentacion = report_expense_options(:opcion_tipo)
    ExpenseRule.update_all(active: false)
    as_user(@admin) do
      ExpenseRule.create!(name: "Duplicados #{SecureRandom.hex(3)}", active: true,
                          applies_to_all_roles: true, check_duplicates: true)
    end
  end

  def gasto(**attrs)
    ReportExpense.new({ omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro,
                        user_invoice: @ingeniero, invoice_name: "Ingeniero Perez", invoice_date: Date.current,
                        invoice_number: "N/A", identification: "1017123456",
                        invoice_value: 10_000, invoice_tax: 0, invoice_total: 10_000,
                        type_identification: @alimentacion }.merge(attrs))
  end

  def guardado(**attrs)
    as_user(@admin) { gasto(**attrs).tap(&:save!) }
  end

  def codigos(expense)
    ExpenseRuleService.validate(expense).value[:violations].map { |v| v[:code] }
  end

  test "dos viaticos de la misma persona con el mismo numero no son duplicados" do
    guardado(type_identification: @viaticos, invoice_number: "FE-123")

    assert_not_includes codigos(gasto(type_identification: @viaticos, invoice_number: "FE-123")),
                        ExpenseRuleService::CODE_DUPLICATE
  end

  test "N/A y sus variantes no son un numero de factura" do
    guardado(invoice_number: "N/A")

    ["N/A", "n.a.", "No aplica", "S/N", "000"].each do |relleno|
      assert_not_includes codigos(gasto(invoice_number: relleno)), ExpenseRuleService::CODE_DUPLICATE,
                          "«#{relleno}» se tomo como factura repetida"
    end
  end

  # La cedula va tambien en el NIT (identification: "1017123456" en `gasto`), asi
  # que dos gastos con la cedula como numero coinciden en los dos campos.
  test "la cedula copiada en el numero no es una factura repetida" do
    guardado(invoice_number: "1017123456")

    assert_not_includes codigos(gasto(invoice_number: "1017123456")), ExpenseRuleService::CODE_DUPLICATE
    assert_not_includes codigos(gasto(invoice_number: "1.017.123.456", identification: "1.017.123.456")),
                        ExpenseRuleService::CODE_DUPLICATE
  end

  # Lo que la regla SI tiene que seguir atrapando.
  test "una factura de verdad repetida sigue siendo duplicada" do
    guardado(invoice_number: "FE-4821", identification: "900123456")

    assert_includes codigos(gasto(invoice_number: "FE-4821", identification: "900123456")),
                    ExpenseRuleService::CODE_DUPLICATE
  end

  test "un segundo viatico se puede guardar" do
    guardado(type_identification: @viaticos, invoice_number: "N/A")

    as_user(@admin) do
      segundo = gasto(type_identification: @viaticos, invoice_number: "N/A")
      assert segundo.save, segundo.errors.full_messages.join
    end
  end
end

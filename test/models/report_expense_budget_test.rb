require "test_helper"

# La superficie presupuestal que el paquete 04 le agrega a ReportExpense: la
# asociacion a la partida, la constante de etiquetas, los cuatro scopes de
# estado y la validacion de inclusion.
#
# Va en archivo propio y no dentro de report_expense_test.rb para no pisarle el
# archivo a otro paquete (matriz de propiedad, 00-ARQUITECTURA.md 7.2).
class ReportExpenseBudgetTest < ActiveSupport::TestCase
  setup do
    @admin      = users(:admin)
    @ingeniero  = users(:ingeniero_dos)
    @centro     = cost_centers(:centro_ajeno)
  end

  # --- BUDGET_STATUS_LABELS -------------------------------------------------

  def test_budget_status_labels_tiene_las_tres_claves_y_esta_congelada
    # Vive AQUI, en el dueño de la columna, y en ningun otro paquete: la leen la
    # plantilla de contabilidad (06) y las tools MCP (11). Si cada uno tuviera
    # su copia, en algun momento la pantalla y el Excel dirian cosas distintas.
    assert_equal %w[sin_presupuesto aprobado excedido].sort,
                 ReportExpense::BUDGET_STATUS_LABELS.keys.sort
    assert_predicate ReportExpense::BUDGET_STATUS_LABELS, :frozen?
  end

  def test_budget_status_labels_cubre_todos_los_valores_validos
    # El contrato real: cualquier valor que la validacion acepte tiene etiqueta.
    # Un estado sin etiqueta se pintaria en blanco en pantalla.
    validos = ExpenseBudgetService::MANAGED_STATUSES + [ExpenseBudgetService::STATUS_SIN_PRESUPUESTO]

    validos.each do |estado|
      assert ReportExpense::BUDGET_STATUS_LABELS.key?(estado),
             "falta la etiqueta legible de #{estado}"
    end
  end

  # --- Validacion -----------------------------------------------------------

  def test_budget_status_solo_acepta_los_tres_valores
    gasto = nuevo_gasto(budget_status: "aprobadisimo")

    assert_not gasto.valid?
    assert_includes gasto.errors.attribute_names, :budget_status
  end

  def test_los_tres_valores_validos_pasan
    %w[sin_presupuesto aprobado excedido].each do |estado|
      assert_predicate nuevo_gasto(budget_status: estado), :valid?, "#{estado} deberia ser valido"
    end
  end

  # --- Asociacion -----------------------------------------------------------

  def test_expense_budget_es_opcional
    # Un gasto historico, o uno cuyo partida se anulo, no apunta a ninguna.
    assert_predicate nuevo_gasto(expense_budget_id: nil), :valid?
  end

  # --- Scopes ---------------------------------------------------------------

  def test_scopes_de_estado_presupuestal
    aprobado  = crear_gasto("aprobado")
    excedido  = crear_gasto("excedido")
    historico = crear_gasto("sin_presupuesto")

    assert_includes ReportExpense.presupuesto_aprobado, aprobado
    assert_not_includes ReportExpense.presupuesto_aprobado, excedido

    assert_includes ReportExpense.presupuesto_excedido, excedido
    assert_includes ReportExpense.sin_presupuesto, historico
  end

  def test_no_excedidos_es_la_base_de_la_vista_de_contabilidad
    aprobado  = crear_gasto("aprobado")
    excedido  = crear_gasto("excedido")
    historico = crear_gasto("sin_presupuesto")

    # El invariante que la contabilidad da por sentado: un excedido NO entra a
    # la vista, un historico SI. Se define en este modelo para que el paquete 06
    # no lo reescriba con otro criterio.
    assert_includes ReportExpense.no_excedidos, aprobado
    assert_includes ReportExpense.no_excedidos, historico
    assert_not_includes ReportExpense.no_excedidos, excedido
  end

  private

  def nuevo_gasto(**overrides)
    ReportExpense.new({ user_id: @admin.id, cost_center_id: @centro.id,
                        user_invoice_id: @ingeniero.id, invoice_name: "Gasto",
                        invoice_date: Date.new(2026, 6, 1), invoice_value: 1000,
                        invoice_tax: 0, invoice_total: 1000 }.merge(overrides))
  end

  def crear_gasto(estado)
    as_user(@admin) { nuevo_gasto(budget_status: estado).tap(&:save!) }
  end
end

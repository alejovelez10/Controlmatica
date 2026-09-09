require "test_helper"

# NO-REGRESION de recalculate_cost_center frente a la multimoneda.
#
# Es la unica red que existe contra el error que corrompe datos en silencio y a
# escala: guardar el valor EXTRANJERO en invoice_value. recalculate_cost_center
# actualiza 23 columnas del centro de una sola vez, y un viat_costo_real mal
# calculado se propaga a aiu, aiu_percent, aiu_real y aiu_percent_real sin que
# ninguna validacion lo note.
class ApplicationHelperCurrencyTest < ActionView::TestCase
  include ApplicationHelper

  setup do
    @admin  = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)
    # TRAMPA DEL LEGADO: CostCenter#change_state (before_update) hace
    # `hour_cotizada * eng_hours` sin guarda de nil, y recalculate_cost_center
    # termina en un `update`. Sin estos dos valores, CUALQUIER recalculo del
    # centro revienta con NoMethodError. Se siembran con update_columns para no
    # disparar el mismo callback en el setup.
    @centro.update_columns(hour_cotizada: 100_000.0, eng_hours: 100.0)
    # Los gastos que las fixtures ya cuelgan del centro se borran para que el
    # test afirme numeros exactos y no diferencias.
    as_user(@admin) { @centro.report_expenses.destroy_all }
  end

  def crear_gasto(extra = {})
    as_user(@admin) do
      ReportExpense.create!({
        cost_center: @centro,
        user_invoice: users(:ingeniero),
        user: @admin,
        invoice_name: "Gasto de prueba",
        invoice_date: Date.new(2026, 7, 17),
        description: "Prueba de multimoneda",
        invoice_number: "INV-#{SecureRandom.hex(3)}",
        identification: "900111222"
      }.merge(extra))
    end
  end

  test "recalculate_cost_center suma los pesos y no la moneda extranjera" do
    crear_gasto(invoice_value: 100_000.0, invoice_tax: 19_000.0, invoice_total: 119_000.0)
    crear_gasto(currency: "USD", foreign_value: 120, foreign_tax: 22.80, exchange_rate: 4120.5)

    recalculate_cost_center(@centro.id)

    esperado = @centro.reports.sum(:viatic_value) + 100_000.0 + 494_460.0

    # Si alguien guardara el valor extranjero (120) en invoice_value, este
    # numero caeria de ~594.460 a ~100.120 y nadie lo notaria hasta el cierre.
    assert_in_delta esperado, @centro.reload.viat_costo_real, 0.01
  end

  test "viat_costo_porcentaje usa el valor en pesos" do
    @centro.update_columns(viatic_value: 1_000_000.0)
    crear_gasto(currency: "USD", foreign_value: 120, foreign_tax: 22.80, exchange_rate: 4120.5)

    recalculate_cost_center(@centro.id)

    # 494.460 / 1.000.000 = 49,4 %. Con el valor extranjero daria 0,0 %.
    assert_equal 49.4, @centro.reload.viat_costo_porcentaje
  end

  test "get_show_center suma lo mismo que recalculate_cost_center" do
    crear_gasto(invoice_value: 100_000.0, invoice_tax: 19_000.0, invoice_total: 119_000.0)
    crear_gasto(currency: "USD", foreign_value: 120, foreign_tax: 22.80, exchange_rate: 4120.5)

    recalculate_cost_center(@centro.id)
    @centro.reload

    # cost_centers_controller.rb:211 calcula el gastado con esta misma suma.
    # Dos verdades distintas del gastado en la misma pantalla es un bug.
    suma_del_controller = @centro.report_expenses.sum(:invoice_value)

    assert_in_delta suma_del_controller,
                    @centro.viat_costo_real - @centro.reports.sum(:viatic_value),
                    0.01
  end

  test "get_currencies publica el catalogo que consume el frontend" do
    assert_equal Currency.options, get_currencies
    assert_equal 7, get_currencies.size
    assert_equal({ label: "COP — Peso colombiano", value: "COP" }, get_currencies.first)
  end
end

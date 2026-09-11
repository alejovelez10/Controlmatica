require "test_helper"

# Conversion y validacion de moneda en ReportExpense.
#
# Todo create/update va dentro de as_user: los callbacks de auditoria leen el
# actor global y sin el revientan con NoMethodError (00-ARQUITECTURA 5.3).
class ReportExpenseCurrencyTest < ActiveSupport::TestCase
  setup do
    @admin = users(:admin)
  end

  def atributos(extra = {})
    {
      cost_center: cost_centers(:centro_con_viaticos),
      user_invoice: users(:ingeniero),
      user: @admin,
      invoice_name: "Proveedor extranjero",
      invoice_date: Date.new(2026, 7, 17),
      description: "Servicio en el exterior",
      invoice_number: "INV-900",
      identification: "900111222"
    }.merge(extra)
  end

  def crear(extra = {})
    as_user(@admin) { ReportExpense.create!(
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        atributos(extra).merge(omitir_comprobante_obligatorio: true)) }
  end

  # --- normalizacion --------------------------------------------------------

  test "por defecto la moneda es COP" do
    gasto = crear(invoice_value: 100_000.0, invoice_tax: 19_000.0, invoice_total: 119_000.0)

    assert_equal "COP", gasto.currency
  end

  test "la moneda se normaliza a mayusculas" do
    gasto = crear(currency: " usd ", foreign_value: 100, exchange_rate: 4000)

    assert_equal "USD", gasto.reload.currency
  end

  test "rechaza moneda fuera del catalogo" do
    gasto = as_user(@admin) { ReportExpense.new(
        atributos(currency: "ARS").merge(omitir_comprobante_obligatorio: true)) }

    assert_not gasto.valid?
    assert_includes gasto.errors.attribute_names, :currency
  end

  # --- to_cop ---------------------------------------------------------------

  test "to_cop redondea a dos decimales y devuelve float" do
    resultado = ReportExpense.to_cop(BigDecimal("120"), BigDecimal("4120.5"))

    assert_equal 494_460.0, resultado
    assert_kind_of Float, resultado
  end

  test "to_cop redondea medio centavo hacia arriba" do
    assert_equal 0.01, ReportExpense.to_cop(BigDecimal("1"), BigDecimal("0.005"))
  end

  test "to_cop con nil devuelve nil" do
    assert_nil ReportExpense.to_cop(nil, BigDecimal("4120.5"))
    assert_nil ReportExpense.to_cop(BigDecimal("120"), nil)
  end

  # --- conversion -----------------------------------------------------------

  test "convierte los tres montos a COP al guardar" do
    gasto = crear(currency: "USD", foreign_value: 120, foreign_tax: 22.80,
                  exchange_rate: 4120.5).reload

    assert_equal 494_460.0, gasto.invoice_value
    assert_equal 93_947.4,  gasto.invoice_tax
    assert_equal 588_407.4, gasto.invoice_total
  end

  test "foreign_total se completa con value mas tax" do
    gasto = crear(currency: "USD", foreign_value: 120, foreign_tax: 22.80,
                  exchange_rate: 4120.5).reload

    assert_equal BigDecimal("142.80"), gasto.foreign_total
  end

  test "invoice_total no se aleja mas de un centavo de la suma de los COP" do
    gasto = crear(currency: "USD", foreign_value: 120, foreign_tax: 22.80,
                  exchange_rate: 4120.5).reload

    assert_in_delta gasto.invoice_value + gasto.invoice_tax, gasto.invoice_total, 0.01
  end

  test "exchange_rate_date se completa con invoice_date" do
    gasto = crear(currency: "USD", foreign_value: 120, exchange_rate: 4120.5).reload

    assert_equal Date.new(2026, 7, 17), gasto.exchange_rate_date
  end

  # --- quien manda sobre los pesos ------------------------------------------

  test "el servidor pisa los COP que manda el cliente" do
    gasto = crear(currency: "USD", foreign_value: 120, foreign_tax: 22.80,
                  exchange_rate: 4120.5, invoice_value: 1).reload

    assert_equal 494_460.0, gasto.invoice_value
  end

  test "cop_manual_override respeta los COP y marca la fuente manual" do
    gasto = crear(currency: "USD", foreign_value: 120, foreign_tax: 22.80,
                  exchange_rate: 4120.5, invoice_value: 500_000,
                  cop_manual_override: "1").reload

    assert_equal 500_000.0, gasto.invoice_value
    assert_equal "manual",  gasto.exchange_rate_source
  end

  test "pasar a COP limpia los campos extranjeros" do
    gasto = crear(currency: "USD", foreign_value: 120, foreign_tax: 22.80,
                  exchange_rate: 4120.5)
    pesos_antes = gasto.reload.invoice_value

    as_user(@admin) { gasto.update!(currency: "COP") }
    gasto.reload

    assert_nil gasto.foreign_value
    assert_nil gasto.foreign_tax
    assert_nil gasto.foreign_total
    assert_nil gasto.exchange_rate
    assert_nil gasto.exchange_rate_date
    assert_nil gasto.exchange_rate_source
    assert_equal pesos_antes, gasto.invoice_value, "los COP ya convertidos no se tocan"
  end

  # --- validaciones ---------------------------------------------------------

  test "moneda extranjera sin foreign_value es invalida" do
    gasto = as_user(@admin) { ReportExpense.new(
        atributos(currency: "USD", exchange_rate: 4120.5).merge(omitir_comprobante_obligatorio: true)) }

    assert_not gasto.valid?
    assert_includes gasto.errors[:foreign_value], "es obligatorio cuando la moneda no es COP"
  end

  test "moneda extranjera sin exchange_rate es invalida" do
    gasto = as_user(@admin) { ReportExpense.new(
        atributos(currency: "USD", foreign_value: 120).merge(omitir_comprobante_obligatorio: true)) }

    assert_not gasto.valid?
    assert_includes gasto.errors[:exchange_rate], "es obligatoria cuando la moneda no es COP"
  end

  test "rechaza tasa y montos extranjeros negativos" do
    gasto = as_user(@admin) do
      ReportExpense.new(
        atributos(currency: "USD", foreign_value: -1, exchange_rate: -4120.5).merge(omitir_comprobante_obligatorio: true))
    end

    assert_not gasto.valid?
    assert_includes gasto.errors.attribute_names, :exchange_rate
    assert_includes gasto.errors.attribute_names, :foreign_value
  end

  test "rechaza exchange_rate_source fuera de SOURCES" do
    gasto = as_user(@admin) do
      ReportExpense.new(
        atributos(currency: "USD", foreign_value: 120, exchange_rate: 4120.5,
                                  exchange_rate_source: "google")
          .merge(omitir_comprobante_obligatorio: true))
    end

    assert_not gasto.valid?
    assert_includes gasto.errors.attribute_names, :exchange_rate_source
  end

  # --- Redondeo de las cifras en pesos ---------------------------------------

  test "el total se guarda redondeado a dos decimales" do
    # EL CASO REAL: el formulario arma el total sumando dos floats en el
    # navegador y manda 119000.11999999999. Antes se guardaba tal cual y la
    # tabla solo lo disimulaba al pintarlo.
    gasto = crear(invoice_value: 100_000.1, invoice_tax: 19_000.02,
                        invoice_total: 100_000.1 + 19_000.02)

    assert_equal 119_000.12, gasto.reload.invoice_total
  end

  test "el redondeo alcanza tambien a valor e IVA" do
    gasto = crear(invoice_value: 33_333.333, invoice_tax: 6_333.336,
                        invoice_total: 39_666.669)

    gasto.reload
    assert_equal 33_333.33, gasto.invoice_value
    assert_equal 6_333.34,  gasto.invoice_tax
    assert_equal 39_666.67, gasto.invoice_total
  end

  test "la TRM NO se redondea: sus seis decimales son significativos" do
    # `exchange_rate` es decimal(18,6) y asi la publica el Banco de la Republica.
    # Recortarla a dos moveria todas las conversiones.
    gasto = crear(currency: "USD", foreign_value: 100, foreign_tax: 0,
                        foreign_total: 100, exchange_rate: 4123.456789,
                        exchange_rate_date: Date.current, exchange_rate_source: "manual")

    assert_equal BigDecimal("4123.456789"), gasto.reload.exchange_rate
  end
end

require "test_helper"

# El cotejo del comprobante contra el formulario (2026-10-25): que se compara,
# con que tolerancia y que se le dice a quien aprueba. Sin IA: las lecturas se
# arman a mano con la misma forma que deja CotejoDelComprobante.lectura_desde.
class CotejoDelComprobanteTest < ActiveSupport::TestCase
  setup do
    @regla = ExpenseRule.new(name: "Cotejo", cross_check_receipt: true)
    @alimentacion = report_expense_options(:opcion_tipo)
  end

  def gasto(**attrs)
    ReportExpense.new({ invoice_total: 105_000, invoice_value: 105_000, invoice_tax: 0, currency: "COP",
                        invoice_date: Date.new(2026, 10, 20), identification: "900123456",
                        invoice_number: "FE-4821", type_identification: @alimentacion }.merge(attrs))
  end

  def leido(campos)
    { "estado" => CotejoDelComprobante::LEIDO, "campos" => campos.stringify_keys }
  end

  def cotejar(expense, lectura, reglas: [@regla])
    expense.lectura_del_comprobante = lectura
    CotejoDelComprobante.evaluar(expense, reglas)
  end

  def factura
    { total: "105000.0", tax: "0", invoice_date: "2026-10-20", identification: "9001234567",
      invoice_number: "FE-4821", currency: "COP" }
  end

  # --- Que coincide --------------------------------------------------------

  test "un comprobante que dice lo mismo que el gasto coincide" do
    resultado = cotejar(gasto, leido(factura))

    assert_equal CotejoDelComprobante::COINCIDE, resultado["estado"]
    assert_empty CotejoDelComprobante.mensajes(resultado)
  end

  test "el NIT con el digito de verificacion es el mismo NIT" do
    resultado = cotejar(gasto(identification: "900.123.456-7"), leido(factura.merge(identification: "900123456")))

    assert_equal CotejoDelComprobante::COINCIDE, resultado["estado"]
  end

  test "el numero de factura sin prefijo ni ceros a la izquierda es el mismo" do
    resultado = cotejar(gasto(invoice_number: "4821"), leido(factura.merge(invoice_number: "FE-0004821")))

    assert_equal CotejoDelComprobante::COINCIDE, resultado["estado"]
  end

  test "los centavos de la factura no son una diferencia" do
    resultado = cotejar(gasto(invoice_total: 105_000), leido(factura.merge(total: "104999.6")))

    assert_equal CotejoDelComprobante::COINCIDE, resultado["estado"]
  end

  # --- Que no coincide -----------------------------------------------------

  test "un total distinto se dice con los dos valores" do
    resultado = cotejar(gasto(invoice_total: 150_000, invoice_value: 150_000), leido(factura))

    assert_equal CotejoDelComprobante::DIFERENCIAS, resultado["estado"]
    assert_equal ["El total del comprobante es $105.000 y se registró $150.000"],
                 CotejoDelComprobante.mensajes(resultado)
  end

  test "una fecha, un NIT y un numero distintos salen los tres" do
    resultado = cotejar(gasto(invoice_date: Date.new(2026, 10, 21), identification: "800111222",
                              invoice_number: "FE-4812"), leido(factura))

    assert_equal %w[invoice_date identification invoice_number], resultado["diferencias"].map { |d| d["campo"] }
    assert_includes CotejoDelComprobante.mensajes(resultado),
                    "La fecha del comprobante es 20/10/2026 y se registró 21/10/2026"
  end

  # Mucha gente pone todo en el valor y deja el IVA en cero: si el total
  # cuadra, eso no es una discrepancia.
  test "el IVA solo se compara cuando se registro IVA" do
    sin_iva = cotejar(gasto, leido(factura.merge(tax: "16764.71")))
    assert_equal CotejoDelComprobante::COINCIDE, sin_iva["estado"]

    con_iva = cotejar(gasto(invoice_value: 85_000, invoice_tax: 20_000), leido(factura.merge(tax: "16764.71")))
    assert_equal ["tax"], con_iva["diferencias"].map { |d| d["campo"] }
  end

  # 2026-10-27: al cambiar el valor el formulario recalcula el total, y solo
  # salia la diferencia del total, sin decir que el dato cambiado fue el valor.
  test "cambiar el valor antes de IVA muestra el valor y el total" do
    ferreteria = factura.merge(value: "250000.0", tax: "47500.0", total: "297500.0")

    resultado = cotejar(gasto(invoice_value: 260_000, invoice_tax: 47_500, invoice_total: 307_500), leido(ferreteria))

    assert_equal ["El valor antes de IVA del comprobante es $250.000 y se registró $260.000",
                  "El total del comprobante es $297.500 y se registró $307.500"],
                 CotejoDelComprobante.mensajes(resultado)
  end

  # Quien pone todo en el valor y deja el IVA en cero tiene el valor igual al
  # total: con el total ya basta, un segundo aviso del valor seria ruido.
  test "sin IVA registrado el valor no se compara aparte" do
    ferreteria = factura.merge(value: "250000.0", tax: "47500.0", total: "297500.0")

    resultado = cotejar(gasto(invoice_value: 297_500, invoice_tax: 0, invoice_total: 297_500), leido(ferreteria))

    assert_equal CotejoDelComprobante::COINCIDE, resultado["estado"]
  end

  test "en divisa se compara el total del documento y no el convertido a pesos" do
    en_dolares = gasto(currency: "USD", foreign_total: 120, foreign_value: 120, foreign_tax: 0,
                       invoice_total: 480_000, invoice_value: 480_000)

    assert_equal CotejoDelComprobante::COINCIDE,
                 cotejar(en_dolares, leido(factura.merge(total: "120.00", currency: "USD")))["estado"]
    distinto = cotejar(en_dolares, leido(factura.merge(total: "130.00", currency: "USD")))
    assert_equal ["El total del comprobante es USD 130,00 y se registró USD 120,00"],
                 CotejoDelComprobante.mensajes(distinto)
  end

  # Una factura en dolares que solo trae «$» se lee como pesos: no es una
  # discrepancia de moneda.
  test "la moneda solo se acusa cuando la factura dice una divisa" do
    en_dolares = gasto(currency: "USD", foreign_total: 105_000, foreign_value: 105_000, foreign_tax: 0)
    assert_equal CotejoDelComprobante::COINCIDE, cotejar(en_dolares, leido(factura))["estado"]

    resultado = cotejar(gasto, leido(factura.merge(currency: "EUR")))
    assert_equal ["La moneda del comprobante es EUR y se registró COP"], CotejoDelComprobante.mensajes(resultado)
  end

  # --- Cuando no se puede cotejar -------------------------------------------

  test "sin comprobante, o con uno que no se pudo leer, queda para revision con el motivo" do
    assert_equal ["No se pudo cotejar el comprobante: el gasto no tiene comprobante"],
                 CotejoDelComprobante.mensajes(cotejar(gasto, CotejoDelComprobante.sin_comprobante))
    assert_equal ["No se pudo cotejar el comprobante: el archivo no parece una factura o comprobante"],
                 CotejoDelComprobante.mensajes(cotejar(gasto, { "estado" => "sin_lectura", "motivo" => "not_an_invoice" }))
  end

  test "si no se leyo con seguridad ningun dato, no se da por bueno" do
    resultado = cotejar(gasto, leido({}))

    assert_equal CotejoDelComprobante::SIN_COTEJAR, resultado["estado"]
    assert_match "ningún dato", CotejoDelComprobante.mensajes(resultado).first
  end

  # --- Cuando no aplica -----------------------------------------------------

  test "sin regla que lo pida, sin lectura o en un viatico no hay cotejo" do
    assert_nil cotejar(gasto(invoice_total: 1), leido(factura), reglas: [ExpenseRule.new(name: "Otra")])
    assert_nil cotejar(gasto, nil)
    assert_nil cotejar(gasto(type_identification: report_expense_options(:opcion_viaticos)), leido(factura))
  end

  test "un gasto guardado se coteja contra la lectura que quedo guardada" do
    guardado = report_expenses(:one)
    guardado.receipt_check = { "lectura" => leido(factura.merge(total: "1.0")) }

    resultado = CotejoDelComprobante.evaluar(guardado, [@regla])

    assert_equal CotejoDelComprobante::DIFERENCIAS, resultado["estado"]
  end

  # --- La lectura -----------------------------------------------------------

  test "de la lectura de la IA solo quedan los campos leidos con seguridad" do
    result = ReceiptExtractionService::Result.new(
      ok: true, model: "claude-x",
      fields: { total: BigDecimal("105000"), tax: BigDecimal("0"), invoice_date: Date.new(2026, 10, 20),
                identification: "900123456", invoice_number: "FE-4821", currency: "COP",
                low_confidence: ["invoice_number"] }
    )

    lectura = CotejoDelComprobante.lectura_desde(result)

    assert_equal "leido", lectura["estado"]
    assert_equal "2026-10-20", lectura["campos"]["invoice_date"]
    refute lectura["campos"].key?("invoice_number"), "un campo dudoso no sirve para acusar a nadie"
  end

  test "una lectura fallida guarda el motivo y una sin configurar no es lectura" do
    fallo = ReceiptExtractionService::Result.new(ok: false, error: :unreadable, fields: {})
    apagado = ReceiptExtractionService::Result.new(ok: false, error: :disabled, fields: {})

    assert_equal({ "estado" => "sin_lectura", "motivo" => "unreadable" }, CotejoDelComprobante.lectura_desde(fallo))
    assert_nil CotejoDelComprobante.lectura_desde(apagado)
  end

  test "la lectura firmada solo vale para el mismo archivo" do
    token = CotejoDelComprobante.token(leido(factura), "bytes del comprobante")

    assert_equal "leido", CotejoDelComprobante.desde_token(token, "bytes del comprobante")["estado"]
    assert_nil CotejoDelComprobante.desde_token(token, "otro archivo")
    assert_nil CotejoDelComprobante.desde_token("inventado--abc", "bytes del comprobante")
  end
end

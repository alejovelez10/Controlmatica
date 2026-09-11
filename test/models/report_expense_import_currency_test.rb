require "test_helper"

# CONTRATO DE MONEDA PARA EL IMPORT DE EXCEL.
#
# `ReportExpense.import` —la deteccion de layout y las 18 posiciones del
# header— tiene dueño unico: el paquete 06 (00-ARQUITECTURA 7.2, Tarea 17 de
# este paquete). Este paquete NO lo toca.
#
# Lo que si es de aqui son las DOS REGLAS DE MONEDA que el 06 debe absorber en
# la tabla de mapeo de su tarea C2, literalmente:
#
#   report_expense.currency = row["currency"].presence || Currency::DEFAULT
#   if Currency.foreign?(report_expense.currency)
#     # foreign_value / exchange_rate / exchange_rate_date / exchange_rate_source
#     report_expense.cop_manual_override = row["invoice_value"].present?
#   end
#
# Estos cuatro casos ejercen ese mapeo contra el archivo real
# test/fixtures/files/gastos_multimoneda.xlsx (dueño: paquete 01) y afirman lo
# que el MODELO hace con el, que es la mitad del contrato que si vive en este
# paquete. Las aserciones extremo a extremo sobre `ReportExpense.import`
# (deteccion de layout, indices del header) son criterio del 06.
#
# Si este paquete cambiara Currency::DEFAULT o Currency.foreign?, hay que
# actualizar la C2 del 06 en el mismo PR.
class ReportExpenseImportCurrencyTest < ActiveSupport::TestCase
  ARCHIVO = Rails.root.join("test/fixtures/files/gastos_multimoneda.xlsx").freeze

  setup do
    @admin  = users(:admin)
    @filas  = leer_filas(ARCHIVO)
  end

  # Lee el xlsx y devuelve hashes con las claves canonicas de moneda del
  # mapeo. Deliberadamente NO reimplementa la deteccion de layout del 06: se
  # ubica por NOMBRE de encabezado, no por posicion.
  def leer_filas(ruta)
    hoja  = Roo::Spreadsheet.open(ruta.to_s)
    cabecera = hoja.row(1).map { |c| c.to_s.strip.upcase }

    (2..hoja.last_row).map do |i|
      celdas = hoja.row(i)
      valor  = ->(nombre) { celdas[cabecera.index(nombre)] if cabecera.index(nombre) }

      {
        "invoice_date"   => valor.("FECHA"),
        "invoice_name"   => valor.("NOMBRE"),
        "currency"       => valor.("MONEDA"),
        "foreign_value"  => valor.("VALOR EXTRANJERO"),
        "exchange_rate"  => valor.("TRM"),
        "invoice_value"  => valor.("VALOR"),
        "invoice_tax"    => valor.("IVA")
      }
    end
  end

  # El bloque de asignacion de moneda que el 06 mete dentro de su C2.
  def construir(row)
    gasto = ReportExpense.new(
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        omitir_comprobante_obligatorio: true,
      cost_center: cost_centers(:centro_con_viaticos),
      user_invoice: users(:ingeniero),
      user: @admin,
      invoice_name: row["invoice_name"],
      invoice_date: row["invoice_date"],
      description: "Importado de Excel",
      invoice_number: "IMP-#{SecureRandom.hex(3)}",
      identification: "900111222",
      invoice_value: row["invoice_value"].to_f,
      invoice_tax: row["invoice_tax"].to_f
    )

    gasto.currency = row["currency"].presence || Currency::DEFAULT

    if Currency.foreign?(gasto.currency)
      gasto.foreign_value        = row["foreign_value"]
      gasto.exchange_rate        = row["exchange_rate"]
      gasto.exchange_rate_date   = row["invoice_date"]
      gasto.exchange_rate_source = "manual"
      # Si el Excel trae el valor en pesos se respeta como verdad: es la
      # columna que alimenta el centro de costos y quien importa suele traer
      # los pesos ya cuadrados con contabilidad.
      gasto.cop_manual_override = row["invoice_value"].present?
    end

    as_user(@admin) { gasto.save! }
    gasto.reload
  end

  test "importa moneda valor extranjero y TRM" do
    fila = @filas.find { |f| f["invoice_name"] == "Hotel Miami" }
    gasto = construir(fila)

    assert_equal "USD", gasto.currency
    assert_equal BigDecimal("300.0"), gasto.foreign_value
    assert_equal BigDecimal("4000.0"), gasto.exchange_rate
    assert_equal Date.new(2026, 6, 1), gasto.exchange_rate_date
  end

  test "una fila sin moneda queda en COP" do
    fila = @filas.find { |f| f["invoice_name"] == "Hotel Miami" }.merge("currency" => nil)
    gasto = construir(fila)

    assert_equal "COP", gasto.currency
    assert_nil gasto.foreign_value
    assert_nil gasto.exchange_rate
  end

  test "si el excel trae el valor en pesos se respeta" do
    # "Cena NY": 100 USD @ 4000 pero la columna VALOR trae 401.000, no 400.000.
    # Los 1.000 de diferencia son justamente lo que se pierde si el servidor
    # recalcula: son el cuadre que hizo contabilidad.
    fila = @filas.find { |f| f["invoice_name"] == "Cena NY" }
    assert fila["invoice_value"].present?, "la fixture debe traer el valor en pesos en esta fila"

    gasto = construir(fila)

    assert_equal 401_000.0, gasto.invoice_value
    assert_equal "manual", gasto.exchange_rate_source
  end

  test "si el excel no trae el valor en pesos se calcula" do
    fila = @filas.find { |f| f["invoice_name"] == "Hotel Madrid" }
    assert fila["invoice_value"].blank?, "la fixture debe traer esta fila sin valor en pesos"

    gasto = construir(fila)

    assert_equal "EUR", gasto.currency
    assert_equal 900_000.0, gasto.invoice_value # 200 EUR x 4500
  end
end

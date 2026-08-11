require "test_helper"

# Las dos plantillas .axlsx de 18 columnas (paquete 06, tareas B9 y C1).
#
# Se lee el xlsx generado con Roo sobre un Tempfile con `response.body`: es la
# unica forma de afirmar sobre el archivo REAL y no sobre el codigo que lo
# escribe.
class ReportExpensesExportTest < ActionDispatch::IntegrationTest
  ENCABEZADOS = ["ID", "Centro de costo", "Responsable", "Fecha de factura", "Nombre",
                 "NIT / CEDULA", "Descripcion", "Numero de factura", "Tipo", "Medio de pago",
                 "Estado operativo", "Estado presupuestal", "Motivo presupuestal", "Moneda",
                 "Valor extranjero", "TRM", "Valor del pago (COP)", "IVA (COP)"].freeze

  setup do
    @admin = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)
  end

  def crear_gasto(**overrides)
    as_user(@admin) do
      ReportExpense.create!({
        user: @admin,
        cost_center: @centro,
        user_invoice: users(:ingeniero),
        type_identification: report_expense_options(:opcion_tipo),
        payment_type: report_expense_options(:opcion_pago),
        invoice_name: "Hotel Export",
        invoice_date: Date.new(2026, 6, 1),
        description: "Alojamiento",
        invoice_number: "FE-X#{SecureRandom.hex(3)}",
        identification: "900111222",
        invoice_value: 100_000.0,
        invoice_tax: 19_000.0,
        invoice_total: 119_000.0
      }.merge(overrides))
    end
  end

  # Vuelca `response.body` a un .xlsx temporal y lo abre con Roo.
  def hoja_de_la_respuesta
    tmp = Tempfile.new(["export", ".xlsx"])
    tmp.binmode
    tmp.write(response.body)
    tmp.flush
    yield Roo::Excelx.new(tmp.path), tmp.path
  ensure
    tmp.close
    tmp.unlink
  end

  test "el export de gastos tiene 18 encabezados en el orden acordado" do
    crear_gasto
    sign_in_as @admin

    get "/download_file/report_expenses/todos"

    assert_response :success
    hoja_de_la_respuesta { |hoja| assert_equal ENCABEZADOS, hoja.row(1) }
  end

  test "el export de gastos trae el id en la primera columna" do
    gasto = crear_gasto
    sign_in_as @admin

    get "/download_file/report_expenses/todos"

    hoja_de_la_respuesta do |hoja|
      ids = (2..hoja.last_row).map { |i| hoja.row(i)[0] }
      assert_includes ids, gasto.id
    end
  end

  test "el export de contabilidad tiene los mismos 18 encabezados" do
    # Garantiza que un archivo bajado desde CUALQUIERA de las dos pantallas es
    # importable con el mismo mapeo.
    crear_gasto
    sign_in_as @admin

    get "/download_file/accounting_expenses/todos"

    assert_response :success
    hoja_de_la_respuesta { |hoja| assert_equal ENCABEZADOS, hoja.row(1) }
  end

  test "el export de contabilidad no incluye excedidos" do
    excedido = crear_gasto(budget_status: "excedido")
    normal = crear_gasto
    sign_in_as @admin

    get "/download_file/accounting_expenses/todos"
    hoja_de_la_respuesta do |hoja|
      ids = (2..hoja.last_row).map { |i| hoja.row(i)[0] }
      refute_includes ids, excedido.id
      assert_includes ids, normal.id
    end

    # Y con type=filtro sin el filtro "Aprobados por contabilidad" tampoco: la
    # excepcion de la correccion 13 solo aplica a ese filtro.
    get "/download_file/accounting_expenses/filtro", params: { cost_center_id: @centro.id }
    hoja_de_la_respuesta do |hoja|
      ids = (2..hoja.last_row).map { |i| hoja.row(i)[0] }
      refute_includes ids, excedido.id
    end
  end

  test "el export no revienta con user_invoice colgante" do
    # db/schema.rb no tiene ni un `add_foreign_key`: una FK colgante es posible
    # y hoy convertia el export entero en un 500.
    gasto = crear_gasto
    gasto.update_columns(user_invoice_id: 999_999_999)
    sign_in_as @admin

    get "/download_file/report_expenses/todos"

    assert_response :success
    hoja_de_la_respuesta do |hoja|
      fila = (2..hoja.last_row).map { |i| hoja.row(i) }.find { |f| f[0] == gasto.id }
      assert_nil fila[2], "la celda de Responsable queda vacia, no revienta el archivo"
    end
  end

  test "el export traduce budget_status a etiqueta legible" do
    gasto = crear_gasto(budget_status: "sin_presupuesto")
    sign_in_as @admin

    get "/download_file/report_expenses/todos"

    hoja_de_la_respuesta do |hoja|
      fila = (2..hoja.last_row).map { |i| hoja.row(i) }.find { |f| f[0] == gasto.id }
      assert_equal "Sin presupuesto", fila[11]
      refute_equal "sin_presupuesto", fila[11]
    end
  end

  test "las dos plantillas declaran 18 anchos de columna" do
    # Criterio 23. La plantilla vieja declaraba 11 anchos para 12 columnas.
    %w[report_expenses accounting_expenses].each do |carpeta|
      fuente = File.read(Rails.root.join("app/views", carpeta, "download_file.xlsx.axlsx"))
      anchos = fuente[/sheet\.column_widths (.+)$/, 1]

      refute_nil anchos, "#{carpeta} no llama a column_widths"
      assert_equal 18, anchos.split(",").length, "#{carpeta} no declara 18 anchos"
    end
  end

  test "roundtrip export-import no duplica" do
    # Cierra el circulo del invariante #7: lo que la aplicacion exporta, la
    # aplicacion lo puede volver a leer.
    gasto = crear_gasto(invoice_name: "Hotel Roundtrip")
    sign_in_as @admin

    get "/download_file/report_expenses/todos"
    assert_response :success

    hoja_de_la_respuesta do |_hoja, ruta|
      assert_no_difference "ReportExpense.count" do
        as_user(@admin) { ReportExpense.import(Struct.new(:path).new(ruta), @admin.id) }
      end
    end

    assert_equal "Hotel Roundtrip", gasto.reload.invoice_name
  end
end

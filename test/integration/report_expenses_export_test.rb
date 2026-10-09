require "test_helper"

# Las dos plantillas .axlsx de 19 columnas (paquete 06, tareas B9 y C1;
# `Observaciones` se sumo el 2026-10-06).
#
# Se lee el xlsx generado con Roo sobre un Tempfile con `response.body`: es la
# unica forma de afirmar sobre el archivo REAL y no sobre el codigo que lo
# escribe.
class ReportExpensesExportTest < ActionDispatch::IntegrationTest
  ENCABEZADOS = ["ID", "Centro de costo", "Responsable", "Fecha de factura", "Nombre",
                 "NIT / CEDULA", "Descripcion", "Numero de factura", "Tipo", "Medio de pago",
                 "Estado operativo", "Estado presupuestal", "Motivo presupuestal", "Moneda",
                 "Valor extranjero", "TRM", "Valor del pago (COP)", "IVA (COP)",
                 "Observaciones"].freeze

  setup do
    @admin = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)

    # Los gastos preexistentes de las fixtures representan cupo YA EJECUTADO.
    # Desde 2026-09-10 solo lo ACEPTADO consume (ExpenseBudgetService.consumidores)
    # y las fixtures del paquete 01 nacen sin aceptar: sin esto el disponible del
    # par sube y el escenario de este archivo deja de ser el que se queria medir.
    ReportExpense.update_all(is_acepted: true, operational_state: ReportExpense::STATE_ACEPTADO)
  end

  def crear_gasto(**overrides)
    as_user(@admin) do
      ReportExpense.create!({
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        omitir_comprobante_obligatorio: true,
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

  test "el export de gastos tiene 19 encabezados en el orden acordado" do
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

  test "el export de contabilidad tiene los mismos 19 encabezados" do
    # Garantiza que un archivo bajado desde CUALQUIERA de las dos pantallas es
    # importable con el mismo mapeo.
    crear_gasto
    sign_in_as @admin

    get "/download_file/accounting_expenses/todos"

    assert_response :success
    hoja_de_la_respuesta { |hoja| assert_equal ENCABEZADOS, hoja.row(1) }
  end

  test "el export de contabilidad SI incluye los excedidos" do
    # LA REGLA SE INVIRTIO (decision de producto, 2026-08-29). Este test afirmaba
    # lo contrario y quedo desalineado cuando `accounting_visible` paso a ser
    # `all`: el estado presupuestal ya no recorta la vista de Contabilidad,
    # porque el gasto excedido es justamente el que hay que mirar y la factura se
    # paga igual. El exceso se informa —aviso en la tabla y `budget_reason`—, no
    # se esconde. La comprobacion se invierte para que el archivo no vuelva a
    # quedarse afirmando una regla que el modelo ya no aplica.
    excedido = crear_gasto(budget_status: "excedido")
    normal = crear_gasto
    sign_in_as @admin

    get "/download_file/accounting_expenses/todos"
    hoja_de_la_respuesta do |hoja|
      ids = (2..hoja.last_row).map { |i| hoja.row(i)[0] }
      assert_includes ids, excedido.id
      assert_includes ids, normal.id
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

  test "las dos plantillas declaran 19 anchos de columna" do
    # Criterio 23. La plantilla vieja declaraba 11 anchos para 12 columnas, y de
    # ahi viene esta prueba. Subio a 19 con `Observaciones` (2026-10-06): un
    # ancho de menos deja la ultima columna con el default y pasa inadvertido.
    %w[report_expenses accounting_expenses].each do |carpeta|
      fuente = File.read(Rails.root.join("app/views", carpeta, "download_file.xlsx.axlsx"))
      anchos = fuente[/sheet\.column_widths (.+)$/, 1]

      refute_nil anchos, "#{carpeta} no llama a column_widths"
      assert_equal 19, anchos.split(",").length, "#{carpeta} no declara 19 anchos"
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

  # --- Observaciones (2026-10-06) -------------------------------------------

  test "el export lleva las observaciones en la ULTIMA columna" do
    gasto = crear_gasto(observations: "Autorizado por el director el 5 de octubre")
    sign_in_as @admin

    get "/download_file/report_expenses/todos"

    hoja_de_la_respuesta do |hoja|
      fila = (2..hoja.last_row).map { |i| hoja.row(i) }.find { |f| f[0] == gasto.id }
      # La posicion 18 (la 19.a columna) es lo que se afirma, no solo que el
      # texto este: si alguien inserta la columna en medio, el import empieza a
      # leer el numero de factura como tipo de gasto y no falla por ningun lado.
      assert_equal "Autorizado por el director el 5 de octubre", fila[18]
    end
  end

  test "un Excel recien exportado se sigue pudiendo reimportar" do
    # ES EL CONTRATO QUE LAS DOS PLANTILLAS EXISTEN PARA CUMPLIR, y la columna
    # nueva es justo lo que lo podia romper: el import mapea POR POSICION contra
    # V2_HEADER_KEYS (18 claves) y arma `Hash[[header, fila].transpose]`, que
    # revienta si las dos listas no miden lo mismo. Con la columna al final, la
    # clave sobrante se queda sin mapear y se ignora.
    gasto = crear_gasto(observations: "No se reimporta, y esta bien")
    sign_in_as @admin

    get "/download_file/report_expenses/todos"

    hoja_de_la_respuesta do |_hoja, ruta|
      ok, fallidas = ReportExpense.import(Struct.new(:path).new(ruta), @admin.id)

      assert_empty fallidas, "el archivo exportado dejo de ser importable"
      assert ok.any?, "el import no leyo ni una fila"
      # Las observaciones NO vuelven por el import, a proposito: la columna no
      # esta en V2_HEADER_KEYS. Lo que importa es que el archivo entre completo.
      assert_equal "No se reimporta, y esta bien", gasto.reload.observations
    end
  end


  test "el Excel pinta el tercer estado y no solo Aceptado/Creado" do
    # La columna "Estado operativo" salia de un ternario sobre `is_acepted`
    # copiado en las dos plantillas: con tres estados, ese ternario pintaba
    # "Creado" sobre un gasto rechazado y el Excel mentia sin fallar.
    rechazado = crear_gasto(operational_state: ReportExpense::STATE_RECHAZADO)
    sign_in_as @admin

    get "/download_file/report_expenses/todos"

    hoja_de_la_respuesta do |hoja|
      fila = (2..hoja.last_row).map { |i| hoja.row(i) }.find { |f| f[0] == rechazado.id }
      assert_equal "Rechazado", fila[10]
    end
  end

  # --- Solo los seleccionados y sus comprobantes (M10, 2026-10-09) ------------

  def ids_del_excel
    hoja_de_la_respuesta { |hoja| return (2..hoja.last_row).map { |i| hoja.row(i)[0] } }
  end

  def con_comprobante(gasto)
    as_user(@admin) do
      gasto.receipt_file = upload_fixture("comprobante.pdf")
      gasto.save!
    end
    gasto
  end

  def entradas_del_zip
    Zip::File.open_buffer(response.body) { |zip| return zip.map(&:name) }
  end

  def texto_del_zip(nombre)
    Zip::File.open_buffer(response.body) { |zip| return zip.read(nombre) }
  end

  test "exportar con ids baja solo los seleccionados" do
    marcado = crear_gasto(invoice_name: "MARCADO")
    otro = crear_gasto(invoice_name: "NO MARCADO")
    sign_in_as @admin

    get "/download_file/report_expenses/seleccion.xlsx", params: { ids: [marcado.id], scope: "all" }

    assert_response :success
    ids = ids_del_excel
    assert_equal [marcado.id], ids
    refute_includes ids, otro.id
  end

  test "la seleccion manda sobre los filtros" do
    # Marco tres filas y pulso "Exportar seleccionados": quiero esas, aunque el
    # filtro aplicado traiga otras.
    marcado = crear_gasto(invoice_name: "MARCADO", invoice_date: Date.new(2026, 1, 15))
    sign_in_as @admin

    get "/download_file/report_expenses/filtro.xlsx",
        params: { ids: [marcado.id], scope: "all", start_date: "2026-06-01" }

    assert_equal [marcado.id], ids_del_excel
  end

  test "los ids que la pestaña no deja ver no se exportan" do
    ajeno = crear_gasto(user_invoice: users(:ingeniero_dos))
    sign_in_as users(:ingeniero)
    grant_permission!(rols(:ingeniero), "Gastos", "Exportar a excel")

    get "/download_file/report_expenses/seleccion.xlsx", params: { ids: [ajeno.id], scope: "mine" }

    assert_response :success
    assert_empty ids_del_excel
  end

  test "descargar comprobantes de la seleccion arma el ZIP y lista los faltantes" do
    con = con_comprobante(crear_gasto(invoice_name: "CLARO SOLUCIONES", invoice_number: "FV-1"))
    sin = crear_gasto(invoice_name: "SIN SOPORTE", invoice_number: "FV-2")
    sign_in_as @admin

    get "/download_receipts/report_expenses", params: { ids: [con.id, sin.id], scope: "all" }

    assert_response :success
    assert_equal "application/zip", response.media_type
    entradas = entradas_del_zip
    # Mismo nombre que el ZIP de Contabilidad: fecha - tercero - factura.
    assert_includes entradas, "2026-06-01 - CLARO SOLUCIONES - FV-1.pdf"
    assert_includes entradas, "FALTANTES.txt"
    assert_includes texto_del_zip("FALTANTES.txt"), "##{sin.id} - SIN SOPORTE"
  end

  test "los comprobantes que la pestaña no deja ver no entran al ZIP" do
    ajeno = con_comprobante(crear_gasto(user_invoice: users(:ingeniero_dos), invoice_name: "AJENO"))
    propio = con_comprobante(crear_gasto(invoice_name: "PROPIO"))
    sign_in_as users(:ingeniero)
    grant_permission!(rols(:ingeniero), "Gastos", "Exportar a excel")

    get "/download_receipts/report_expenses", params: { ids: [ajeno.id, propio.id], scope: "mine" }

    assert_response :success
    entradas = entradas_del_zip
    assert entradas.any? { |e| e.include?("PROPIO") }
    refute entradas.any? { |e| e.include?("AJENO") }
  end

  test "descargar comprobantes sin permiso de exportar responde 403" do
    gasto = crear_gasto
    sign_in_as users(:ingeniero) # el rol ingeniero no trae "Exportar a excel"

    get "/download_receipts/report_expenses", params: { ids: [gasto.id] }

    assert_json_forbidden
  end

  test "descargar comprobantes sin seleccion responde un error entendible" do
    sign_in_as @admin

    get "/download_receipts/report_expenses"

    assert_json_error(incluye: "Seleccione al menos un gasto")
  end
end

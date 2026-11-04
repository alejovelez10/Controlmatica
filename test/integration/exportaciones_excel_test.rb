require "test_helper"

# Los Excel (.xls) de Centros de costo, Materiales, Ordenes de compra y
# Tableristas.
#
# 3-nov-2026, David: "en centros de costo uno le dice exportar y sale mocho" y
# "en materiales y ocs saca error". Los logs de Heroku de ese dia muestran el
# error: `undefined method 'downcase' for nil` en Material.search y
# SalesOrder.search, porque el frontend nuevo solo manda los filtros que tienen
# valor. Tableristas tenia el mismo error.
#
# La regla que blindan estas pruebas: el Excel sale de la MISMA consulta que la
# tabla (busqueda, filtros y orden) y trae las columnas de la pantalla. Las
# pruebas "trae lo mismo que la tabla" piden la tabla y el Excel con la misma
# consulta y comparan los registros y su orden.
#
# Se abre el archivo real con la gema spreadsheet: afirmar sobre el codigo que
# lo escribe no diria si el .xls sale bien.
class ExportacionesExcelTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)   # cliente_uno, user admin
    @centro_ajeno = cost_centers(:centro_ajeno)    # cliente_dos, user contador
    sign_in_as @admin
  end

  def hoja
    Spreadsheet.open(StringIO.new(response.body)).worksheet(0)
  end

  def encabezados
    hoja.row(0).to_a
  end

  def filas_de_datos
    hoja.rows.drop(1).map(&:to_a)
  end

  # Valor de la fila bajo el encabezado dado.
  def celda(fila, encabezado)
    indice = encabezados.index(encabezado)
    assert indice, "el Excel no tiene la columna #{encabezado.inspect}"
    fila[indice]
  end

  # Claves de los registros del Excel, en orden. Con una fila por factura, un
  # registro ocupa varias filas seguidas: se colapsan.
  def claves_del_excel(encabezado)
    filas_de_datos.map { |f| celda(f, encabezado) }.chunk_while { |a, b| a == b }.map(&:first)
  end

  def json
    JSON.parse(response.body)
  end

  def assert_columnas_ok(controlador)
    assert_response :success
    assert_equal controlador::ENCABEZADOS_EXCEL, encabezados
    filas_de_datos.each do |fila|
      assert_operator fila.size, :<=, controlador::ENCABEZADOS_EXCEL.size,
                      "una fila no puede tener mas celdas que encabezados"
    end
  end

  # ── Materiales ──

  def preparar_materiales
    @proveedor_a = Provider.create!(name: "Electricos SAS")
    @proveedor_b = Provider.create!(name: "Ferreteria Beta")
    materials(:one).update_columns(provider_id: @proveedor_a.id, cost_center_id: @centro.id, sales_number: "OC-M1",
                                   description: "Cable 12 AWG", sales_date: Date.new(2026, 8, 10), amount: 500_000,
                                   sales_state: "PROCESADO", created_at: 3.days.ago)
    materials(:two).update_columns(provider_id: @proveedor_b.id, cost_center_id: @centro_ajeno.id, sales_number: "OC-M2",
                                   description: "Breaker 3x50", sales_date: Date.new(2026, 5, 1), amount: 200_000,
                                   sales_state: "INGRESADO TOTAL", created_at: 2.days.ago)
    Material.insert_all!([{ provider_id: @proveedor_a.id, cost_center_id: @centro_ajeno.id, user_id: @admin.id,
                            sales_number: "OC-M3", description: "Tubo conduit", sales_date: Date.new(2026, 9, 20),
                            amount: 900_000, sales_state: "PROCESADO", created_at: 1.day.ago, updated_at: 1.day.ago }])
    material_invoices(:one).update_columns(material_id: materials(:one).id, number: "FM-1", value: 300_000,
                                           observation: "Primer pago", created_at: 2.days.ago)
    material_invoices(:two).update_columns(material_id: materials(:one).id, number: "FM-2", value: 200_000,
                                           observation: "Saldo", created_at: 1.day.ago)
  end

  test "materiales: el filtro por fechas de David ya no revienta y respeta el rango" do
    preparar_materiales

    get "/download_file/materials/filtro.xls?date_desde=2026-07-24&date_hasta=2026-11-03"

    assert_columnas_ok MaterialsController
    assert_equal ["Tubo conduit", "Cable 12 AWG"], claves_del_excel("Descripción")
  end

  test "materiales: trae lo mismo que la tabla con cada busqueda, filtro y orden" do
    preparar_materiales
    consultas = [
      "",
      "search=cable",
      "search=ferreteria",
      "date_desde=2026-07-24&date_hasta=2026-11-03",
      "provider_id=#{@proveedor_a.id}&sort=amount&dir=desc",
      "estado=PROCESADO",
      "cost_center_id=#{@centro_ajeno.id}&sort=sales_date&dir=asc",
      "search=oc-m&sort=description&dir=asc",
    ]

    consultas.each do |q|
      get "/get_materials?page=1&per_page=100&#{q}"
      assert_response :success
      de_la_tabla = json["data"].map { |m| m["description"] }
      assert_equal json["meta"]["total"], de_la_tabla.size

      get "/download_file/materials/#{q.empty? ? 'todos.xls' : "filtro.xls?#{q}"}"
      assert_response :success
      assert_equal de_la_tabla, claves_del_excel("Descripción"), "consulta #{q.inspect}"
    end
  end

  test "materiales: las columnas de la pantalla, con una fila por factura" do
    preparar_materiales

    get "/download_file/materials/filtro.xls?sales_number=OC-M1"

    assert_columnas_ok MaterialsController
    filas = filas_de_datos
    assert_equal 2, filas.size
    assert_equal ["Electricos SAS", "Electricos SAS"], filas.map { |f| celda(f, "Proveedor") }
    assert_equal ["CM-ACME-01-2026"] * 2, filas.map { |f| celda(f, "Centro de costo") }
    assert_equal [500_000, 0], filas.map { |f| celda(f, "Valor") }, "el valor del material solo en la primera"
    assert_equal ["FM-1", "FM-2"], filas.map { |f| celda(f, "Número de factura") }
    assert_equal [300_000, 200_000], filas.map { |f| celda(f, "Valor de la factura") }
    assert_equal ["Primer pago", "Saldo"], filas.map { |f| celda(f, "Descripción de la factura") }
    assert_equal [500_000, 0], filas.map { |f| celda(f, "Valor facturas") }
    assert_equal Date.new(2026, 8, 10), celda(filas.first, "Fecha de orden")
    assert_equal "PROCESADO", celda(filas.first, "Estado")
    assert_equal @admin.names, celda(filas.first, "Creado por")
  end

  test "materiales: sin filtros exporta todos" do
    get "/download_file/materials/todos.xls"

    assert_columnas_ok MaterialsController
    assert_equal Material.count, filas_de_datos.size
  end

  # ── Ordenes de compra ──

  def preparar_ordenes
    @centro_ajeno.update_columns(invoiced_state: "FACTURADO")
    sales_orders(:one).update_columns(cost_center_id: @centro.id, order_number: "OC-100", created_date: Date.new(2025, 3, 1),
                                      description: "Tablero principal", order_value: 1_000_000, user_id: @admin.id,
                                      order_file: nil, created_at: 3.days.ago)
    sales_orders(:two).update_columns(cost_center_id: @centro_ajeno.id, order_number: "OC-200", created_date: Date.new(2023, 1, 1),
                                      description: "Mantenimiento anual", order_value: 2_000_000, created_at: 2.days.ago)
    SalesOrder.insert_all!([{ cost_center_id: @centro.id, order_number: "OC-300", created_date: Date.new(2026, 6, 15),
                              description: "Ampliacion tablero", order_value: 500_000,
                              created_at: 1.day.ago, updated_at: 1.day.ago }])
    customer_invoices(:one).update_columns(sales_order_id: sales_orders(:one).id, cost_center_id: @centro.id, number_invoice: "FV-1",
                                           invoice_value: 600_000, engineering_value: 100_000, invoice_date: Date.new(2026, 2, 1))
    customer_invoices(:two).update_columns(sales_order_id: sales_orders(:one).id, cost_center_id: @centro.id, number_invoice: "FV-2",
                                           invoice_value: 400_000, engineering_value: 50_000, invoice_date: Date.new(2026, 3, 1))
  end

  test "ordenes: el filtro por fechas de David ya no revienta y respeta el rango" do
    preparar_ordenes

    get "/download_file/sales_orders/filtro.xls?date_desde=2024-07-23&date_hasta=2026-11-03"

    assert_columnas_ok SalesOrdersController
    assert_equal ["OC-300", "OC-100"], claves_del_excel("# Orden")
  end

  test "ordenes: trae lo mismo que la tabla con cada busqueda, filtro y orden" do
    preparar_ordenes
    # Como las arma packs/SalesOrders.js: search, sort y dir van siempre.
    consultas = [
      "search=&sort=&dir=asc",
      "search=tablero&sort=&dir=asc",
      "search=beta&sort=&dir=asc",
      "search=&sort=&dir=asc&date_desde=2024-07-23&date_hasta=2026-11-03",
      "search=&sort=order_value&dir=asc&customer=#{customers(:cliente_uno).id}",
      "search=&sort=&dir=asc&number_invoice=FV-2",
      "search=&sort=&dir=asc&description=anual",
      "search=&sort=&dir=asc&state=FACTURADO",
      "search=&sort=created_date&dir=desc&cost_center_id=#{@centro.id}",
    ]

    consultas.each do |q|
      get "/get_sales_order?page=1&per_page=100&#{q}"
      assert_response :success
      de_la_tabla = json["data"].map { |o| o["order_number"] }
      assert_equal json["meta"]["total"], de_la_tabla.size

      get "/download_file/sales_orders/filtro.xls?#{q}"
      assert_response :success
      assert_equal de_la_tabla, claves_del_excel("# Orden"), "consulta #{q.inspect}"
    end
  end

  test "ordenes: las columnas de la pantalla, con una fila por factura" do
    preparar_ordenes

    get "/download_file/sales_orders/filtro.xls?number_order=OC-100"

    assert_columnas_ok SalesOrdersController
    filas = filas_de_datos
    assert_equal 2, filas.size
    assert_equal ["CM-ACME-01-2026", "ACME S.A.S"], [celda(filas.first, "Centro de costo"), celda(filas.first, "Cliente")]
    assert_equal ["FV-2", "FV-1"], filas.map { |f| celda(f, "Número de factura") }, "la factura mas reciente va primero"
    assert_equal [1_000_000, 0], filas.map { |f| celda(f, "Valor") }
    assert_equal [400_000, 600_000], filas.map { |f| celda(f, "Valor de la factura") }
    assert_equal [50_000, 100_000], filas.map { |f| celda(f, "Ingeniería de la factura") }
    assert_equal [1_000_000, 0], filas.map { |f| celda(f, "Total facturas") }
    assert_equal [150_000, 0], filas.map { |f| celda(f, "Total ingeniería") }
    assert_equal "Tablero principal", celda(filas.first, "Descripción")
    assert_equal "No", celda(filas.first, "Tiene archivo")

    get "/download_file/sales_orders/filtro.xls?number_order=OC-200"
    assert_equal "Sí", celda(filas_de_datos.first, "Tiene archivo"), "la fixture OC-200 trae order_file"
    assert_equal @admin.names, celda(filas.first, "Creado por")
  end

  test "ordenes: sin filtros exporta todas, aunque alguna no tenga centro de costo" do
    # Las fixtures de sales_orders apuntan a cost_center_id 1, que no existe.
    get "/download_file/sales_orders/todos.xls"

    assert_columnas_ok SalesOrdersController
    assert_equal SalesOrder.count, filas_de_datos.size
  end

  # ── Tableristas ──

  def preparar_tableristas
    contractors(:one).update_columns(description: "Cableado tablero", sales_date: Date.new(2026, 9, 1), hours: 8,
                                     user_execute_id: users(:ingeniero).id, created_at: 2.days.ago)
    contractors(:two).update_columns(description: "Pruebas FAT", sales_date: Date.new(2026, 1, 1), hours: 4,
                                     user_execute_id: users(:ingeniero_dos).id, cost_center_id: @centro_ajeno.id,
                                     created_at: 1.day.ago)
  end

  test "tableristas: filtrar solo por fechas ya no revienta y respeta el rango" do
    preparar_tableristas

    get "/download_file/contractors/filtro.xls?date_desde=2026-07-24&date_hasta=2026-11-03"

    assert_columnas_ok ContractorsController
    assert_equal ["Cableado tablero"], claves_del_excel("Descripción")
  end

  test "tableristas: trae lo mismo que la tabla con cada busqueda, filtro y orden" do
    preparar_tableristas
    consultas = [
      "",
      "search=tablero",
      "search=cm-beta",
      "date_desde=2026-07-24&date_hasta=2026-11-03",
      "user_execute_id=#{users(:ingeniero).id}",
      "cost_center_id=#{@centro_ajeno.id}",
      "descripcion=fat",
      "sort=hours&dir=asc",
    ]

    consultas.each do |q|
      get "/get_contractors?page=1&per_page=100&#{q}"
      assert_response :success
      de_la_tabla = json["data"].map { |c| c["description"] }
      assert_equal json["meta"]["total"], de_la_tabla.size

      get "/download_file/contractors/#{q.empty? ? 'todos.xls' : "filtro.xls?#{q}"}"
      assert_response :success
      assert_equal de_la_tabla, claves_del_excel("Descripción"), "consulta #{q.inspect}"
    end
  end

  test "tableristas: las columnas de la pantalla" do
    preparar_tableristas

    get "/download_file/contractors/filtro.xls?descripcion=cableado"

    assert_columnas_ok ContractorsController
    fila = filas_de_datos.first
    assert_equal Date.new(2026, 9, 1), celda(fila, "Fecha")
    assert_equal "CM-ACME-01-2026", celda(fila, "Centro de costo")
    assert_equal 8, celda(fila, "Horas")
    assert_equal users(:ingeniero).names, celda(fila, "Realizado por")
    assert_equal @admin.names, celda(fila, "Creado por")
    assert_equal @admin.names, celda(fila, "Actualizado por"), "sin edicion, igual que la tabla: quien lo creo"
  end

  test "tableristas: sin filtros exporta todos" do
    get "/download_file/contractors/todos.xls"

    assert_columnas_ok ContractorsController
    assert_equal Contractor.count, filas_de_datos.size
  end

  # ── Centros de costo ──

  test "centros: trae lo mismo que la tabla con cada busqueda, filtro y orden" do
    vacios = "descripcion=&customer_id=&cost_center_id=&execution_state=&service_type=&invoiced_state=&date_desde=&date_hasta=&quotation_number="
    # Como las arma indexTable.jsx#loadData: orden siempre, filtros con
    # filtering=true y la barra de busqueda como descripcion.
    consultas = [
      "sort_column=created_at&sort_direction=desc",
      "sort_column=code&sort_direction=asc",
      "sort_column=created_at&sort_direction=desc&filtering=true&#{vacios.sub('customer_id=', "customer_id=#{customers(:cliente_dos).id}")}",
      "sort_column=code&sort_direction=desc&descripcion=tope&filtering=true",
      "sort_column=code&sort_direction=asc&filtering=true&#{vacios.sub('customer_id=', "customer_id=#{customers(:cliente_uno).id}")}&descripcion=caso",
    ]

    consultas.each do |q|
      get "/get_cost_centers?page=1&per_page=100&#{q}"
      assert_response :success
      de_la_tabla = json["cost_centers_paginate"].map { |c| c["code"] }
      assert_equal json["meta"]["total"], de_la_tabla.size

      get "/download_file/cost_centers/filtro.xls?#{q}"
      assert_response :success
      assert_equal de_la_tabla, claves_del_excel("Código"), "consulta #{q.inspect}"
    end
  end

  test "centros: sin «Ver todos» el Excel trae solo los suyos, igual que la tabla" do
    sign_in_as users(:contador)

    get "/get_cost_centers?page=1&per_page=100&sort_column=created_at&sort_direction=desc"
    de_la_tabla = json["cost_centers_paginate"].map { |c| c["code"] }
    assert_equal ["CM-BETA-01-2026"], de_la_tabla

    get "/download_file/cost_centers/filtro.xls?sort_column=created_at&sort_direction=desc"
    assert_equal de_la_tabla, claves_del_excel("Código")
  end

  test "centros: el Excel trae las columnas de la pantalla, no las 12 de antes" do
    get "/download_file/cost_centers/todos.xls"

    assert_columnas_ok CostCentersController
    assert_operator CostCentersController::ENCABEZADOS_EXCEL.size, :>, 40
  end

  test "centros: cada indicador cae debajo de su encabezado" do
    @centro.update_columns(
      eng_hours: 100, ing_horas_eje: 80, ing_horas_porcentaje: 80.0,
      displacement_hours: 10, value_displacement_hours: 50_000,
      ing_costo_real: 7_000_000, ing_costo_porcentaje: 65.0,
      viat_costo_real: 1_250_000, viat_costo_porcentaje: 25.0,
      fact_real: 9_000_000, aiu: 750_000, aiu_percent_real: 12.5,
      quotation_value: 30_000_000, sales_state: "COMPRANDO"
    )

    get "/download_file/cost_centers/todos.xls"

    assert_columnas_ok CostCentersController
    fila = filas_de_datos.find { |f| celda(f, "Código") == "CM-ACME-01-2026" }
    assert fila, "no salio el centro CM-ACME-01-2026"

    assert_equal "ACME S.A.S", celda(fila, "Cliente")
    assert_equal "COMPRANDO", celda(fila, "Estado compras")
    assert_equal 80, celda(fila, "Ingeniería: horas ejecutadas")
    # Igual que la pantalla: valor de ingenieria + horas de desplazamiento x su valor.
    assert_equal 20_500_000, celda(fila, "Ingeniería: $ cotizado")
    assert_equal 7_000_000, celda(fila, "Ingeniería: $ costo")
    assert_equal 5_000_000, celda(fila, "Viáticos: $ cotizado")
    assert_equal 1_250_000, celda(fila, "Viáticos: $ gastado")
    assert_equal 9_000_000, celda(fila, "Facturación: $ facturado")
    assert_equal 750_000, celda(fila, "AIU actual: $")
    assert_equal 12.5, celda(fila, "AIU cotizado: %")
    assert_equal 30_000_000, celda(fila, "$ Total cotizado")
    assert_equal @admin.names, celda(fila, "Creado por")
    assert_equal users(:dueno_centro).names, celda(fila, "Propietario")
    assert_equal Date.new(2026, 1, 15), celda(fila, "Fecha de inicio")
  end

  test "centros: la URL vieja del Excel (sin filtering=true) tambien filtra" do
    get "/download_file/cost_centers/filtro.xls?descripcion=&customer_id=#{customers(:cliente_dos).id}&cost_center_id=&execution_state=&service_type=&invoiced_state=&date_desde=&date_hasta=&quotation_number="

    assert_response :success
    assert_equal ["CM-BETA-01-2026"], claves_del_excel("Código")
  end
end

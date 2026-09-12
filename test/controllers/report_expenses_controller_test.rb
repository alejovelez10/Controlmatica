require "test_helper"

# Capa HTTP de la pantalla de Gastos (paquete 07, bloque 6).
#
# Lo que este archivo cuida es la superficie que el frontend consume por string:
# el buscador libre, los cuatro filtros nuevos, la allowlist de orden, los campos
# que el usuario PUEDE escribir y —sobre todo— los seis que NO puede.
#
# LOS SEIS CAMPOS PROHIBIDOS TIENEN UN TEST CADA UNO Y NO UNO SOLO CON UN LOOP:
# si algun dia alguien agrega uno a los strong params, el nombre del test que
# falla dice exactamente cual, y ese es el minuto que separa un fix de una
# investigacion.
class ReportExpensesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    @otro = users(:ingeniero_dos)
    @centro = cost_centers(:centro_con_viaticos)
    @uno = report_expenses(:one)
    @dos = report_expenses(:two)

    # Deuda preexistente del legado: CostCenter#change_state multiplica
    # hour_cotizada * eng_hours sin guarda de nil y revienta en cuanto
    # recalculate_cost_center hace update sobre el centro. El modelo y la fixture
    # son de otros paquetes: se rellenan los dos campos aqui.
    [@centro, cost_centers(:centro_ajeno)].each { |c| c.update_columns(hour_cotizada: 0.0, eng_hours: 0.0) }
  end

  def parametros_gasto(**overrides)
    {
      # El comprobante es obligatorio desde 2026-09-10: sin el, el create por la
      # via web se rechaza y estos tests no llegarian a probar lo suyo.
      receipt_file: upload_fixture("comprobante.pdf"),
      cost_center_id: @centro.id,
      user_invoice_id: @ingeniero.id,
      invoice_name: "Hotel Nuevo",
      invoice_date: "2026-06-10",
      description: "Alojamiento",
      invoice_number: "FE-N#{SecureRandom.hex(3)}",
      identification: "900111222",
      invoice_value: 10_000,
      invoice_tax: 0,
      invoice_total: 10_000
    }.merge(overrides)
  end

  # --- get_report_expenses: busqueda libre ----------------------------------

  test "get_report_expenses implementa q sobre los campos de texto" do
    sign_in_as @admin
    # Cada fragmento identifica SOLO a report_expenses(:one). Sin el fix, `q` se
    # ignora en silencio y las cuatro devuelven la tabla completa.
    {
      "Hotel Uno" => :invoice_name,
      "FE-001" => :invoice_number
    }.each do |fragmento, campo|
      get get_report_expenses_path, params: { q: fragmento }
      data = assert_json_list
      assert_equal 1, json_body["total"], "q=#{fragmento.inspect} (#{campo}) no filtro nada"
      assert_equal @uno.id, data.first["id"]
    end

    # description e identification son iguales en las dos fixtures: el fragmento
    # tiene que devolver LAS DOS, no la tabla entera. Se comprueba con un gasto
    # de un tercer texto que NO debe aparecer.
    ajeno = as_user(@admin) { ReportExpense.create!(
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        parametros_gasto(invoice_name: "Restaurante", description: "Comida de campo", identification: "800999888").merge(omitir_comprobante_obligatorio: true)) }

    get get_report_expenses_path, params: { q: "Alojamiento de comision" }
    ids = assert_json_list.map { |g| g["id"] }
    assert_equal [@uno.id, @dos.id].sort, ids.sort
    refute_includes ids, ajeno.id

    get get_report_expenses_path, params: { q: "800999888" }
    assert_equal [ajeno.id], assert_json_list.map { |g| g["id"] }
  end

  test "get_report_expenses q busca por id del registro" do
    sign_in_as @admin

    get get_report_expenses_path, params: { q: @uno.id.to_s }

    data = assert_json_list
    assert_equal 1, json_body["total"]
    assert_equal @uno.id, data.first["id"]
  end

  # --- get_report_expenses: filtros nuevos ----------------------------------

  test "get_report_expenses filtra por currency" do
    sign_in_as @admin
    # update_columns y no update: forzar la moneda sin pasar por la validacion
    # de foreign_* es exactamente lo que hay que hacer para tener una fila USD
    # sin montar una conversion completa.
    @uno.update_columns(currency: "USD")

    get get_report_expenses_path, params: { currency: "USD" }

    data = assert_json_list
    refute_empty data
    assert(data.all? { |g| g["currency"] == "USD" })
    assert_equal [@uno.id], data.map { |g| g["id"] }
  end

  test "get_report_expenses filtra por budget_status" do
    sign_in_as @admin
    @uno.update_columns(budget_status: "excedido", budget_reason: "no cabe")

    get get_report_expenses_path, params: { budget_status: "excedido" }

    data = assert_json_list
    assert_equal [@uno.id], data.map { |g| g["id"] }
    assert(data.all? { |g| g["budget_status"] == "excedido" })
  end

  test "get_report_expenses filtra por accounting_approved false" do
    sign_in_as @admin
    @uno.update_columns(accounting_approved: true, accounting_approved_by_id: users(:contador).id,
                        accounting_approved_at: Time.current)

    get get_report_expenses_path, params: { accounting_approved: "false" }

    data = assert_json_list
    # ESTE ES EL CASO QUE ROMPE con `.reject(&:blank?)` sobre booleanos: el
    # string "false" NO es blank y tiene que llegar al filtro. Si se pierde, el
    # filtro "pendientes por aprobar" muestra tambien los aprobados.
    refute_empty data
    assert(data.none? { |g| g["accounting_approved"] })
    refute_includes data.map { |g| g["id"] }, @uno.id
  end

  test "get_report_expenses filtra por expense_budget_id" do
    sign_in_as @admin
    partida = expense_budgets(:activa_ingeniero)
    @uno.update_columns(expense_budget_id: partida.id)

    get get_report_expenses_path, params: { expense_budget_id: partida.id }

    assert_equal [@uno.id], assert_json_list.map { |g| g["id"] }
  end

  test "get_report_expenses sin ningun filtro devuelve todos" do
    sign_in_as @admin

    get get_report_expenses_path

    # Verifica que al quitar el bloque `has_filters` el `search({})` no filtre a
    # cero: con un builder mal escrito la tabla se queda vacia sin error.
    assert_equal ReportExpense.count, json_body["total"]
  end

  # --- get_report_expenses: orden -------------------------------------------

  test "get_report_expenses ordena por las columnas nuevas" do
    sign_in_as @admin
    @uno.update_columns(currency: "USD", budget_status: "excedido", accounting_approved: true)

    get get_report_expenses_path, params: { sort: "id", dir: "asc" }
    ids = assert_json_list.map { |g| g["id"] }
    assert_equal ids.sort, ids, "sort=id&dir=asc no ordeno ascendente"

    get get_report_expenses_path, params: { sort: "currency", dir: "asc" }
    monedas = assert_json_list.map { |g| g["currency"] }
    assert_equal monedas.sort, monedas

    get get_report_expenses_path, params: { sort: "budget_status", dir: "asc" }
    estados = assert_json_list.map { |g| g["budget_status"] }
    assert_equal estados.sort, estados

    get get_report_expenses_path, params: { sort: "accounting_approved", dir: "desc" }
    assert_response :success
    assert_equal @uno.id, assert_json_list.first["id"], "el aprobado va primero con dir=desc"
  end

  test "get_report_expenses con sort desconocido no revienta y cae al orden por defecto" do
    sign_in_as @admin

    # `params[:sort]` entra a un Arel.sql sin escapar: lo que no este en la
    # allowlist NO puede llegar al SQL.
    get get_report_expenses_path, params: { sort: "id; DROP TABLE report_expenses" }

    assert_response :success
    assert ReportExpense.table_exists?
  end

  test "get_report_expenses sin Ver todos solo devuelve los del responsable" do
    ajeno = as_user(@admin) { ReportExpense.create!(
        parametros_gasto(user_invoice_id: @otro.id).merge(omitir_comprobante_obligatorio: true)) }
    sign_in_as @ingeniero

    get get_report_expenses_path

    data = assert_json_list
    refute_empty data
    assert(data.all? { |g| g["user_invoice_id"] == @ingeniero.id })
    refute_includes data.map { |g| g["id"] }, ajeno.id
  end

  # --- Pestañas de la lista (params[:scope]) --------------------------------
  #
  # `dueno_centro` es la fixture que sostiene todo este bloque: tiene el rol
  # `presupuesto_limitado` (SIN "Ver todos") y es el `user_owner` de
  # `centro_con_viaticos`, donde viven los gastos :one y :two, que son de
  # `ingeniero`. O sea: la pestaña le muestra gastos que NO son suyos y que sin
  # ella no alcanzaba a ver. Si alguien le cambia el rol o el propietario del
  # centro, estos tests pasan a verde sin probar nada.

  test "get_report_expenses con scope owned_centers devuelve los gastos de los centros propios aunque no sean suyos" do
    sign_in_as users(:dueno_centro)

    get get_report_expenses_path, params: { scope: "owned_centers" }

    ids = assert_json_list.map { |g| g["id"] }
    assert_includes ids, @uno.id
    assert_includes ids, @dos.id
    refute_equal users(:dueno_centro).id, @uno.user_invoice_id,
                 "La fixture dejo de probar lo suyo: el gasto es del propio dueno del centro"
  end

  test "get_report_expenses con scope owned_centers no devuelve los gastos de centros ajenos" do
    ajeno = as_user(@admin) { ReportExpense.create!(
        parametros_gasto(cost_center_id: cost_centers(:centro_ajeno).id).merge(omitir_comprobante_obligatorio: true)) }
    sign_in_as users(:dueno_centro)

    get get_report_expenses_path, params: { scope: "owned_centers" }

    refute_includes assert_json_list.map { |g| g["id"] }, ajeno.id
  end

  test "get_report_expenses con scope mine recorta al responsable aunque tenga Ver todos" do
    sign_in_as @admin

    get get_report_expenses_path, params: { scope: "mine" }

    data = assert_json_list
    assert(data.all? { |g| g["user_invoice_id"] == @admin.id })
    refute_includes data.map { |g| g["id"] }, @uno.id
  end

  # El scope NO es una puerta trasera: sin permiso, `all` sigue recortando al
  # responsable. Si alguna vez `apply_expense_scope` trata "all" como un caso
  # propio en vez de caer al `else`, este test lo caza.
  test "get_report_expenses con scope all no salta el permiso Ver todos" do
    ajeno = as_user(@admin) { ReportExpense.create!(
        parametros_gasto(user_invoice_id: @otro.id).merge(omitir_comprobante_obligatorio: true)) }
    sign_in_as @ingeniero

    get get_report_expenses_path, params: { scope: "all" }

    refute_includes assert_json_list.map { |g| g["id"] }, ajeno.id
  end

  # LA ACEPTACION MASIVA VA POR FILTRO, NO POR PAGINA: si el scope no llegara
  # hasta aqui, aceptar desde "Centros a mi cargo" tocaria gastos que la pantalla
  # no estaba mostrando. Es el peor de los bugs posibles de esta pestaña.
  test "update_filter_values respeta el scope de la pestaña" do
    fuera = as_user(@admin) { ReportExpense.create!(
        parametros_gasto(cost_center_id: cost_centers(:centro_ajeno).id).merge(omitir_comprobante_obligatorio: true)) }
    sign_in_as @admin

    patch update_filter_values_path, params: { scope: "owned_centers" }

    assert_response :success
    refute fuera.reload.is_acepted, "Se acepto un gasto de un centro fuera de la pestaña"
  end

  test "get_report_expenses expone los campos nuevos en el serializer" do
    sign_in_as @admin

    get get_report_expenses_path

    fila = assert_json_list.first
    esperadas = %w[budget_status budget_reason expense_budget_id
                   accounting_approved accounting_approved_at accounting_approved_by
                   receipt_file currency foreign_value foreign_tax foreign_total
                   exchange_rate exchange_rate_date exchange_rate_source]

    assert_equal [], esperadas - fila.keys,
                 "Faltan claves en el JSON de gastos: #{(esperadas - fila.keys).inspect}"
  end

  # --- get_cost_center_report_expenses --------------------------------------

  test "get_cost_center_report_expenses acepta las columnas de orden nuevas" do
    sign_in_as @admin

    get "/get_cost_center_report_expenses/#{@centro.id}", params: { sort: "budget_status", dir: "asc" }

    assert_response :success
    assert_kind_of Array, json_body["data"]
  end

  test "get_cost_center_report_expenses q busca por id" do
    sign_in_as @admin

    get "/get_cost_center_report_expenses/#{@centro.id}", params: { q: @uno.id.to_s }

    assert_equal 1, json_body["total"]
    assert_equal @uno.id, assert_json_list.first["id"]
  end

  test "get_cost_center_report_expenses filtra por budget_status" do
    sign_in_as @admin
    @uno.update_columns(budget_status: "excedido")

    get "/get_cost_center_report_expenses/#{@centro.id}", params: { budget_status: "excedido" }

    assert_equal [@uno.id], assert_json_list.map { |g| g["id"] }
  end

  # --- mass-assignment: los seis campos que escribe el servidor -------------

  test "create no permite setear budget_status" do
    sign_in_as @admin

    # Un valor que el servicio JAMAS puede escribir: si aparece, llego del body.
    post report_expenses_path, params: parametros_gasto(budget_status: "valor_inventado")

    assert_response :success
    refute_equal "valor_inventado", ReportExpense.order(:id).last.budget_status
  end

  test "create no permite setear budget_reason" do
    sign_in_as @admin

    post report_expenses_path, params: parametros_gasto(budget_reason: "razon del atacante")

    refute_equal "razon del atacante", ReportExpense.order(:id).last.budget_reason
  end

  test "create no permite setear expense_budget_id" do
    sign_in_as @admin
    ajena = expense_budgets(:activa_otro_usuario)

    post report_expenses_path, params: parametros_gasto(expense_budget_id: ajena.id)

    refute_equal ajena.id, ReportExpense.order(:id).last.expense_budget_id,
                 "El body eligio la partida: el servidor decide contra cual se imputa"
  end

  test "create no permite setear accounting_approved" do
    sign_in_as @admin

    post report_expenses_path, params: parametros_gasto(accounting_approved: true)

    refute ReportExpense.order(:id).last.accounting_approved,
           "Un gasto no puede nacer aprobado por contabilidad desde el navegador"
  end

  test "create no permite setear accounting_approved_by_id" do
    sign_in_as @admin

    post report_expenses_path, params: parametros_gasto(accounting_approved_by_id: users(:contador).id)

    assert_nil ReportExpense.order(:id).last.accounting_approved_by_id
  end

  test "create no permite setear accounting_approved_at" do
    sign_in_as @admin

    post report_expenses_path, params: parametros_gasto(accounting_approved_at: Time.current.iso8601)

    assert_nil ReportExpense.order(:id).last.accounting_approved_at
  end

  test "update no permite setear budget_status ni accounting_approved" do
    sign_in_as @admin
    antes = @uno.accounting_approved

    patch report_expense_path(@uno), params: { budget_status: "valor_inventado",
                                               accounting_approved: true }

    @uno.reload
    refute_equal "valor_inventado", @uno.budget_status
    assert_equal antes, @uno.accounting_approved
  end

  test "los strong params no nombran ninguno de los seis campos del servidor" do
    # Criterio 9 del paquete 07, verificado desde el codigo y no leyendo el
    # archivo a mano: `permit` devuelve solo lo que autoriza.
    controller = ReportExpensesController.new
    prohibidos = %i[budget_status budget_reason expense_budget_id
                    accounting_approved accounting_approved_by_id accounting_approved_at]

    assert_equal [], ReportExpensesController::EXPENSE_WRITABLE_PARAMS & prohibidos,
                 "Hay campos del servidor en los strong params de gastos"
    refute_nil controller
  end

  # --- campos nuevos que el usuario SI puede escribir -----------------------

  test "create acepta currency y los campos foreign" do
    sign_in_as @admin

    post report_expenses_path, params: parametros_gasto(
      currency: "USD", foreign_value: "120.00", foreign_tax: "0.0", foreign_total: "120.00",
      exchange_rate: "4000.0", exchange_rate_date: "2026-06-10", exchange_rate_source: "manual"
    )

    assert_response :success
    gasto = ReportExpense.order(:id).last
    assert_equal "USD", gasto.currency
    assert_equal BigDecimal("120.0"), gasto.foreign_value
    assert_equal BigDecimal("0.0"), gasto.foreign_tax
    assert_equal BigDecimal("120.0"), gasto.foreign_total
    assert_equal BigDecimal("4000.0"), gasto.exchange_rate
    assert_equal Date.new(2026, 6, 10), gasto.exchange_rate_date
    # Sin override el servidor tiene la ultima palabra sobre invoice_value.
    assert_equal 480_000.0, gasto.invoice_value
  end

  test "create con cop_manual_override respeta el invoice_value enviado" do
    sign_in_as @admin

    post report_expenses_path, params: parametros_gasto(
      currency: "USD", foreign_value: "120.00", foreign_total: "120.00",
      exchange_rate: "4000.0", exchange_rate_date: "2026-06-10",
      cop_manual_override: "1", invoice_value: 500_123, invoice_total: 500_123
    )

    assert_response :success
    gasto = ReportExpense.order(:id).last
    # Regla D2 del paquete 05: sin el strong param, el servidor recalcularia
    # 120 * 4000 = 480.000 y le borraria el ajuste al usuario en silencio.
    assert_equal 500_123.0, gasto.invoice_value
    assert_equal "manual", gasto.exchange_rate_source
  end

  test "create acepta el comprobante por multipart" do
    sign_in_as @admin

    post report_expenses_path, params: parametros_gasto(receipt_file: upload_fixture("comprobante.pdf"))

    assert_response :success
    gasto = ReportExpense.order(:id).last
    assert gasto.receipt_file.present?,
           "Sin :receipt_file en los strong params el POST multipart descarta el comprobante en silencio"
  end

  test "update acepta remove_receipt_file para quitar el comprobante" do
    sign_in_as @admin
    as_user(@admin) do
      @uno.receipt_file = upload_fixture("comprobante.pdf")
      @uno.save!
    end
    assert @uno.reload.receipt_file.present?, "montaje: el gasto debe empezar con comprobante"

    patch report_expense_path(@uno), params: { remove_receipt_file: "1" }

    assert_response :success
    assert @uno.reload.receipt_file.blank?
  end

  # --- destroy ---------------------------------------------------------------

  test "destroy recalcula el centro de costos" do
    sign_in_as @admin
    gasto = as_user(@admin) { ReportExpense.create!(
        parametros_gasto(invoice_value: 77_000).merge(omitir_comprobante_obligatorio: true)) }
    # Se parte del valor YA recalculado para que la asercion mida el efecto del
    # destroy y no el arrastre de las fixtures.
    as_user(@admin) { @centro.update_columns(viat_costo_real: ReportExpense.where(cost_center_id: @centro.id).sum(:invoice_value)) }
    antes = @centro.reload.viat_costo_real.to_f

    delete report_expense_path(gasto)

    assert_response :success
    assert_in_delta antes - 77_000, @centro.reload.viat_costo_real.to_f, 0.01,
                    "El destroy no llamo a recalculate_cost_center"
  end

  test "destroy responde el contrato JSON de exito" do
    sign_in_as @admin
    gasto = as_user(@admin) { ReportExpense.create!(
        parametros_gasto.merge(omitir_comprobante_obligatorio: true)) }

    assert_difference -> { ReportExpense.count }, -1 do
      delete report_expense_path(gasto)
    end

    assert_equal "success", json_body["type"]
  end
end

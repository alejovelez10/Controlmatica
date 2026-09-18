require "test_helper"

# Los cinco endpoints de Contabilidad (paquete 06, bloque B).
#
# Los gastos con `budget_status` y `accounting_approved` distintos del default se
# crean AQUI y no en test/fixtures/report_expenses.yml: ese archivo es del
# paquete 01 (§7.2) y `test/models/schema_gastos_ia_test.rb` (paquete 02) afirma
# que ninguna fixture tiene budget_status != "sin_presupuesto" ni
# accounting_approved = true.
#
# ⚠️ FRONTERA CON EL PAQUETE 07. El test "get_accounting_expenses expone los
# campos nuevos" del documento del 06 (claves `accounting_approved`,
# `accounting_approved_at`, `receipt_file`, `budget_status`, `currency` en la
# primera fila) NO se escribe aqui: `app/serializers/report_expense_serializer.rb`
# tiene dueño unico **07** (§7.2) y hoy no emite ninguna de las cinco. Es el
# mismo hueco que el paquete 05 dejo documentado para sus 7 campos de moneda. El
# scope, los filtros, los gates y la auditoria —que es lo que este paquete si
# posee— quedan cubiertos abajo.
class AccountingExpensesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @contador = users(:contador)
    @ingeniero = users(:ingeniero)
    @centro = cost_centers(:centro_con_viaticos)
  end

  # `is_acepted: true` por defecto: Contabilidad SOLO ve gastos aprobados
  # operativamente (AccountingExpensesController#filtered_scope), asi que un gasto
  # sin aceptar no es un caso valido de esta pantalla y dejaria todos los tests de
  # filtros y orden trabajando sobre un listado vacio. Los tests que necesitan el
  # caso contrario lo piden explicitamente con `crear_gasto(is_acepted: false)`.
  def crear_gasto(**overrides)
    as_user(@admin) do
      ReportExpense.create!({
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        omitir_comprobante_obligatorio: true,
        user: @admin,
        cost_center: @centro,
        user_invoice: @ingeniero,
        is_acepted: true,
        invoice_name: "Hotel Contable",
        invoice_date: Date.new(2026, 6, 1),
        description: "Alojamiento",
        invoice_number: "FE-K#{SecureRandom.hex(3)}",
        identification: "900111222",
        invoice_value: 100_000.0,
        invoice_tax: 19_000.0,
        invoice_total: 119_000.0
      }.merge(overrides))
    end
  end

  # Contador con acceso al modulo pero SIN "Aprobar" ni "Exportar a excel":
  # es el usuario con el que se prueban los gates de accion.
  def contador_solo_ingreso
    grant_permission!(rols(:contador), "Contabilidad", "Ingreso al modulo")
    grant_permission!(rols(:contador), "Contabilidad", "Ver todos")
    revoke_permission!(rols(:contador), "Contabilidad", "Contabilizar")
    revoke_permission!(rols(:contador), "Contabilidad", "Exportar a excel")
    @contador
  end

  def contador_aprobador
    grant_permission!(rols(:contador), "Contabilidad", "Ingreso al modulo")
    grant_permission!(rols(:contador), "Contabilidad", "Ver todos")
    grant_permission!(rols(:contador), "Contabilidad", "Contabilizar")
    @contador
  end

  # --- index ----------------------------------------------------------------

  test "index sin permiso redirige a root" do
    sign_in_as users(:sin_permisos)

    get accounting_expenses_path

    assert_redirected_to root_path
    assert_equal "No tiene permiso para ingresar al módulo de Contabilidad", flash[:alert]
  end

  test "index con permiso arma los tres estados" do
    # La plantilla HTML es del paquete 09. Se consulta en JSON para poder
    # verificar el contrato de `@estados` sin inventar un ERB provisional.
    sign_in_as @admin

    get accounting_expenses_path, as: :json

    assert_response :success
    assert_equal %w[approve export show_all], json_body["estados"].keys.sort
    assert_equal [true, true, true], json_body["estados"].values_at("approve", "export", "show_all")
  end

  test "index en JSON tambien responde 403 sin permiso de modulo" do
    sign_in_as users(:sin_permisos)

    get accounting_expenses_path, as: :json

    assert_json_forbidden
  end

  # --- get_accounting_expenses ---------------------------------------------

  test "get_accounting_expenses devuelve data y total" do
    crear_gasto
    sign_in_as @admin

    get get_accounting_expenses_path

    assert_json_list
    assert_equal %w[data total], json_body.keys.sort
  end

  # LA REGLA SE INVIRTIO (2026-08-29): "a contabilidad debe llegar todo lo que
  # esta aprobado, no importa si es exceso". Las dos pruebas de abajo afirmaban
  # `refute_includes` y protegian el recorte por estado presupuestal, que es lo
  # que se quito. El unico filtro que queda es el operativo (`is_acepted`).
  test "get_accounting_expenses tambien devuelve los excedidos" do
    excedido = crear_gasto(budget_status: "excedido")
    sign_in_as @admin

    get get_accounting_expenses_path

    assert_includes assert_json_list.map { |r| r["id"] }, excedido.id
  end

  # Antes se llamaba "un aprobado empujado a excedido no sale por defecto" y era
  # media correccion 13: el gasto se escondia y habia que rescatarlo con el
  # filtro "Aprobados por contabilidad". Ya no se esconde, asi que no hay nada
  # que rescatar; la prueba se queda para fijar que sale POR DEFECTO, sin filtro.
  test "un aprobado empujado a excedido sigue saliendo por defecto" do
    gasto = crear_gasto(budget_status: "excedido")
    gasto.update_columns(accounting_approved: true, accounting_approved_by_id: @admin.id)
    sign_in_as @admin

    get get_accounting_expenses_path

    assert_includes assert_json_list.map { |r| r["id"] }, gasto.id
  end

  test "un aprobado empujado a excedido si sale con el filtro Aprobados por contabilidad" do
    # Segunda mitad de la correccion 13: contabilidad no puede perder de vista
    # algo que ella misma aprobo.
    gasto = crear_gasto(budget_status: "excedido")
    gasto.update_columns(accounting_approved: true, accounting_approved_by_id: @admin.id)
    sign_in_as @admin

    get get_accounting_expenses_path, params: { accounting_approved: "true" }

    assert_includes assert_json_list.map { |r| r["id"] }, gasto.id
  end

  # --- Las dos vistas de la pantalla ----------------------------------------
  #
  # La pantalla tiene dos pestanas: "Por aprobar" (la que abre) y "Aprobados".
  # Las dos son el MISMO endpoint con `accounting_approved` distinto, asi que lo
  # que se prueba aqui es que el parametro recorta de verdad: si dejara de
  # aplicarse, "Por aprobar" listaria tambien lo ya aprobado y contabilidad
  # volveria a revisar lo que ya reviso.

  test "la vista Por aprobar deja fuera lo ya aprobado" do
    pendiente = crear_gasto
    aprobado  = crear_gasto
    aprobado.update_columns(accounting_approved: true, accounting_approved_by_id: @admin.id)
    sign_in_as @admin

    get get_accounting_expenses_path, params: { accounting_approved: "false" }

    ids = assert_json_list.map { |r| r["id"] }
    assert_includes ids, pendiente.id
    refute_includes ids, aprobado.id
  end

  test "las dos vistas se reparten los gastos sin perder ninguno" do
    pendiente = crear_gasto
    aprobado  = crear_gasto
    aprobado.update_columns(accounting_approved: true, accounting_approved_by_id: @admin.id)
    sign_in_as @admin

    get get_accounting_expenses_path, params: { accounting_approved: "false" }
    pendientes = assert_json_list.map { |r| r["id"] }

    get get_accounting_expenses_path, params: { accounting_approved: "true" }
    aprobados = assert_json_list.map { |r| r["id"] }

    assert_empty pendientes & aprobados, "un gasto no puede salir en las dos pestanas"
    assert_includes pendientes, pendiente.id
    assert_includes aprobados,  aprobado.id
  end

  test "el Excel de la vista Por aprobar tampoco trae lo aprobado" do
    # El boton de exportar manda SIEMPRE type=filtro (aun sin filtros), porque es
    # la unica rama de download_file que pasa por filtered_scope. Con "todos" el
    # Excel traia la tabla entera y no coincidia con la pestana en pantalla.
    pendiente = crear_gasto(invoice_name: "PENDIENTE-EXPORT")
    aprobado  = crear_gasto(invoice_name: "APROBADO-EXPORT")
    aprobado.update_columns(accounting_approved: true, accounting_approved_by_id: @admin.id)
    sign_in_as @admin

    get "/download_file/accounting_expenses/filtro", params: { accounting_approved: "false" }

    assert_response :success
    tmp = Tempfile.new(["export", ".xlsx"])
    begin
      tmp.binmode
      tmp.write(response.body)
      tmp.flush
      texto = Roo::Excelx.new(tmp.path).to_a.flatten.map(&:to_s)
      assert_includes texto, pendiente.invoice_name
      refute_includes texto, aprobado.invoice_name
    ensure
      tmp.close
      tmp.unlink
    end
  end

  # --- ZIP de comprobantes --------------------------------------------------

  def gasto_con_comprobante(**overrides)
    gasto = crear_gasto(**overrides)
    as_user(@admin) do
      gasto.receipt_file = Rack::Test::UploadedFile.new(
        Rails.root.join("test/fixtures/files/comprobante.pdf"), "application/pdf",
        original_filename: "comprobante.pdf"
      )
      gasto.save!
    end
    gasto
  end

  def entradas_del_zip
    Zip::File.open_buffer(response.body) { |zip| return zip.map(&:name) }
  end

  test "download_receipts arma un zip con los comprobantes seleccionados" do
    uno = gasto_con_comprobante
    dos = gasto_con_comprobante
    sign_in_as @admin

    get "/download_receipts/accounting_expenses", params: { ids: [uno.id, dos.id] }

    assert_response :success
    assert_equal "application/zip", response.media_type
    nombres = entradas_del_zip
    # El id va delante del nombre: los dos archivos se llaman "comprobante.pdf" y
    # sin el prefijo el segundo pisaria al primero dentro del zip.
    assert_includes nombres, "#{uno.id}-comprobante.pdf"
    assert_includes nombres, "#{dos.id}-comprobante.pdf"
  end

  test "download_receipts lista aparte los gastos sin comprobante en vez de fallar" do
    con    = gasto_con_comprobante
    sin    = crear_gasto(invoice_name: "Sin soporte")
    sign_in_as @admin

    get "/download_receipts/accounting_expenses", params: { ids: [con.id, sin.id] }

    assert_response :success
    nombres = entradas_del_zip
    assert_includes nombres, "#{con.id}-comprobante.pdf"
    # Un zip con 1 de 2 facturas y sin decir cual falta es peor que uno que lo diga.
    assert_includes nombres, "FALTANTES.txt"
  end

  test "download_receipts sin seleccion responde error y no un zip vacio" do
    sign_in_as @admin

    get "/download_receipts/accounting_expenses"

    assert_json_error(incluye: "Seleccione al menos un gasto")
  end

  test "download_receipts respeta el recorte de la pantalla, no los ids a secas" do
    # Sin el `filtered_scope`, mandar ids a mano bajaria comprobantes de gastos
    # que el usuario no tiene permiso ni de ver en la tabla.
    ajeno = gasto_con_comprobante(user_invoice: @ingeniero)
    contador = contador_solo_ingreso
    # Necesita el permiso de exportar (es el gate del ZIP) pero NO "Ver todos":
    # ese es exactamente el usuario que el recorte tiene que frenar.
    grant_permission!(rols(:contador), "Contabilidad", "Exportar a excel")
    revoke_permission!(rols(:contador), "Contabilidad", "Ver todos")
    sign_in_as contador

    get "/download_receipts/accounting_expenses", params: { ids: [ajeno.id] }

    assert_response :success
    refute_includes entradas_del_zip, "#{ajeno.id}-comprobante.pdf"
  end

  test "download_receipts sin permiso de exportar responde 403" do
    sign_in_as users(:sin_permisos)

    get "/download_receipts/accounting_expenses", params: { ids: [1] }, as: :json

    assert_json_forbidden
  end

  # --- Solo lo aprobado operativamente --------------------------------------
  #
  # `is_acepted` es la aceptacion del responsable del gasto. Hasta que ocurre, el
  # gasto todavia se puede editar o rechazar y no tiene por que llegar a
  # Contabilidad.

  test "get_accounting_expenses NO devuelve gastos sin aceptar operativamente" do
    sin_aceptar = crear_gasto(is_acepted: false)
    aceptado    = crear_gasto(is_acepted: true)
    sign_in_as @admin

    get get_accounting_expenses_path

    ids = assert_json_list.map { |r| r["id"] }
    refute_includes ids, sin_aceptar.id
    assert_includes ids, aceptado.id
  end

  test "un gasto sin aceptar tampoco sale con el filtro Aprobados por contabilidad" do
    # El unico ensanche de la base (correccion 13) es para los excedidos ya
    # aprobados; no debe convertirse en una puerta trasera para los no aceptados.
    gasto = crear_gasto(is_acepted: false)
    gasto.update_columns(accounting_approved: true, accounting_approved_by_id: @admin.id)
    sign_in_as @admin

    get get_accounting_expenses_path, params: { accounting_approved: "true" }

    refute_includes assert_json_list.map { |r| r["id"] }, gasto.id
  end

  test "la aprobacion masiva por ids NO toca un gasto sin aceptar" do
    # Es el caso peligroso: sin el guard en la base, contabilidad podia aprobar
    # en bloque hasta 500 gastos que el responsable no habia aceptado.
    sin_aceptar = crear_gasto(is_acepted: false)
    sign_in_as @admin

    patch update_accounting_filter_values_path, params: { ids: [sin_aceptar.id] }

    assert_equal 0, json_body["count"]
    refute sin_aceptar.reload.accounting_approved,
           "un gasto sin aceptar operativamente jamas puede quedar aprobado por contabilidad"
  end

  test "get_accounting_expenses incluye sin_presupuesto" do
    # Sin esto la pantalla vendida al cliente sale vacia: los 5.008 gastos
    # historicos estan todos en sin_presupuesto.
    gasto = crear_gasto(budget_status: "sin_presupuesto")
    sign_in_as @admin

    get get_accounting_expenses_path

    assert_includes assert_json_list.map { |r| r["id"] }, gasto.id
  end

  test "sin Ver todos solo devuelve los gastos propios" do
    crear_gasto(user_invoice: @ingeniero)
    propio = crear_gasto(user_invoice: @contador)
    contador = contador_solo_ingreso
    revoke_permission!(rols(:contador), "Contabilidad", "Ver todos")
    sign_in_as contador

    get get_accounting_expenses_path

    filas = assert_json_list
    assert_includes filas.map { |r| r["id"] }, propio.id
    assert filas.all? { |r| r["user_invoice_id"] == contador.id },
           "un contador sin 'Ver todos' no puede ver los gastos de otros"
  end

  test "q busca por id de registro" do
    gasto = crear_gasto
    sign_in_as @admin

    get get_accounting_expenses_path, params: { q: gasto.id.to_s }

    assert_includes assert_json_list.map { |r| r["id"] }, gasto.id
  end

  test "q busca por numero de factura" do
    gasto = crear_gasto(invoice_number: "FE-BUSCAME-9")
    sign_in_as @admin

    get get_accounting_expenses_path, params: { q: "buscame" }

    assert_equal [gasto.id], assert_json_list.map { |r| r["id"] }
  end

  test "sort no permitido no revienta y ordena por invoice_date" do
    # Test de inyeccion: params[:sort] entra a un Arel.sql, que no escapa nada.
    viejo = crear_gasto(invoice_date: Date.new(2026, 1, 1))
    nuevo = crear_gasto(invoice_date: Date.new(2026, 12, 1))
    sign_in_as @admin

    get get_accounting_expenses_path, params: { sort: "encrypted_password; DROP TABLE users" }

    ids = assert_json_list.map { |r| r["id"] }
    assert_operator ids.index(nuevo.id), :<, ids.index(viejo.id),
                    "el orden por defecto es invoice_date DESC"
  end

  test "per_page tope en 100" do
    sign_in_as @admin

    get get_accounting_expenses_path, params: { per_page: 500 }

    assert_operator assert_json_list.length, :<=, 100
  end

  test "get_accounting_expenses sin permiso de modulo responde 403" do
    sign_in_as users(:sin_permisos)

    get get_accounting_expenses_path

    assert_json_forbidden
  end

  # --- update_accounting_state ---------------------------------------------

  test "update_accounting_state sin permiso Aprobar responde 403" do
    gasto = crear_gasto
    sign_in_as contador_solo_ingreso

    patch "/update_accounting_state/#{gasto.id}/true"

    assert_json_forbidden
    refute gasto.reload.accounting_approved
  end

  test "update_accounting_state true setea by_id y at" do
    gasto = crear_gasto
    sign_in_as @admin

    patch "/update_accounting_state/#{gasto.id}/true"

    assert_json_success(mensaje: "¡El gasto fue aprobado por contabilidad!")
    gasto.reload
    assert gasto.accounting_approved
    assert_equal @admin.id, gasto.accounting_approved_by_id
    assert_not_nil gasto.accounting_approved_at
  end

  test "update_accounting_state false limpia by_id y at" do
    gasto = crear_gasto
    gasto.update_columns(accounting_approved: true, accounting_approved_by_id: @admin.id,
                         accounting_approved_at: Time.now)
    sign_in_as @admin

    patch "/update_accounting_state/#{gasto.id}/false"

    assert_json_success(mensaje: "¡Se retiró la aprobación contable!")
    gasto.reload
    refute gasto.accounting_approved
    assert_nil gasto.accounting_approved_by_id
    assert_nil gasto.accounting_approved_at
  end

  # EL CANDADO SE RETIRO (2026-08-29). Antes esta prueba afirmaba el error "No se
  # puede aprobar contablemente un gasto que excede el presupuesto". El exceso es
  # informacion para quien decide, no una prohibicion: la factura existe y hay que
  # pagarla, y negar la aprobacion solo dejaba al contador sin forma de cerrar el
  # gasto. La prueba se conserva invertida para que el candado no vuelva por
  # accidente.
  test "update_accounting_state aprueba tambien un excedido" do
    excedido = crear_gasto(budget_status: "excedido")
    sign_in_as @admin

    patch "/update_accounting_state/#{excedido.id}/true"

    assert_json_success(mensaje: "¡El gasto fue aprobado por contabilidad!")
    excedido.reload
    assert excedido.accounting_approved
    assert_equal @admin.id, excedido.accounting_approved_by_id
    # El exceso NO se borra al aprobar: el motivo sigue disponible para el
    # historico y para la pantalla.
    assert_equal "excedido", excedido.budget_status
  end

  test "update_accounting_state deja RegisterEdit del modulo Contabilidad" do
    gasto = crear_gasto
    sign_in_as @admin

    assert_difference "RegisterEdit.count", 1 do
      patch "/update_accounting_state/#{gasto.id}/true"
    end

    registro = RegisterEdit.last
    assert_equal "Contabilidad", registro.module
    refute_equal "Gatos", registro.module
    assert_match "APROBACIÓN CONTABLE", registro.description
  end

  # --- update_accounting_filter_values (masiva) ----------------------------

  test "update_accounting_filter_values sin filtros no aprueba nada" do
    # EL test que corrige el bug de report_expenses_controller.rb#update_filter_values:
    # sin guarda, un clic aprueba la tabla entera.
    crear_gasto
    crear_gasto
    sign_in_as @admin

    patch update_accounting_filter_values_path

    assert_json_error(incluye: "Debe aplicar al menos un filtro")
    assert_equal 0, ReportExpense.where(accounting_approved: true).count
  end

  test "update_accounting_filter_values con accounting_approved como unico parametro no cuenta como filtro" do
    # Caso borde no obvio: `accounting_approved=false` es "toda la tabla".
    crear_gasto
    sign_in_as @admin

    patch update_accounting_filter_values_path, params: { accounting_approved: "false" }

    assert_json_error(incluye: "Debe aplicar al menos un filtro")
    assert_equal 0, ReportExpense.where(accounting_approved: true).count
  end

  test "update_accounting_filter_values con filtro aprueba y devuelve el conteo" do
    ReportExpense.delete_all
    a = crear_gasto
    b = crear_gasto
    sign_in_as @admin

    patch update_accounting_filter_values_path, params: { cost_center_id: @centro.id }

    assert_equal 2, json_body["count"]
    assert_equal "2 gastos aprobados por contabilidad", json_body["success"]
    assert a.reload.accounting_approved
    assert b.reload.accounting_approved
  end

  # Coherencia entre el boton de una fila y el masivo: si "Aprobar" acepta un
  # excedido, el masivo del mismo filtro no puede saltarselo en silencio. Antes
  # esta prueba afirmaba lo contrario.
  test "update_accounting_filter_values tambien aprueba un excedido" do
    excedido = crear_gasto(budget_status: "excedido")
    sign_in_as @admin

    patch update_accounting_filter_values_path, params: { cost_center_id: @centro.id }

    assert_equal "success", json_body["type"]
    assert excedido.reload.accounting_approved
  end

  test "update_accounting_filter_values escribe un solo RegisterEdit" do
    3.times { crear_gasto }
    sign_in_as @admin

    assert_difference "RegisterEdit.count", 1 do
      patch update_accounting_filter_values_path, params: { cost_center_id: @centro.id }
    end

    assert_equal "Contabilidad", RegisterEdit.last.module
    assert_match "APROBACIÓN CONTABLE MASIVA", RegisterEdit.last.description
  end

  test "update_accounting_filter_values escribe last_user_edited_id y updated_at" do
    # `update_all` no dispara `edit_values` ni `touch`: si no se escriben a mano,
    # los registros quedan sin trazabilidad de quien los toco.
    gasto = crear_gasto
    gasto.update_columns(last_user_edited_id: nil, updated_at: 2.years.ago)
    sign_in_as @admin

    patch update_accounting_filter_values_path, params: { cost_center_id: @centro.id }

    gasto.reload
    assert_equal @admin.id, gasto.last_user_edited_id
    assert_operator gasto.updated_at, :>, 1.hour.ago
  end

  test "update_accounting_filter_values con mas de MAX_BULK responde error" do
    ReportExpense.delete_all
    2.times { crear_gasto }
    sign_in_as @admin

    con_max_bulk(1) do
      patch update_accounting_filter_values_path, params: { cost_center_id: @centro.id }
    end

    assert_json_error(incluye: "más de 1 gastos")
    assert_equal 0, ReportExpense.where(accounting_approved: true).count
  end

  test "ids cuenta como filtro y aprueba solo esos gastos" do
    # CORRECCION 5: es el backend de la aprobacion por seleccion multiple del
    # paquete 09. Sin `ids` en FILTER_KEYS, la seleccion no tendria endpoint.
    a = crear_gasto
    b = crear_gasto
    c = crear_gasto
    sign_in_as @admin

    patch update_accounting_filter_values_path, params: { ids: [a.id, b.id] }

    assert_equal "success", json_body["type"]
    assert_equal 2, json_body["count"]
    assert a.reload.accounting_approved
    assert b.reload.accounting_approved
    refute c.reload.accounting_approved
  end

  test "ids con un excedido lo aprueba y el count lo refleja" do
    ok = crear_gasto
    excedido = crear_gasto(budget_status: "excedido")
    sign_in_as @admin

    patch update_accounting_filter_values_path, params: { ids: [ok.id, excedido.id] }

    assert_equal 2, json_body["count"], "el count es de filas actualizadas, no de ids recibidos"
    assert ok.reload.accounting_approved
    assert excedido.reload.accounting_approved
  end

  test "ids con mas de MAX_BULK responde error" do
    a = crear_gasto
    b = crear_gasto
    sign_in_as @admin

    con_max_bulk(1) do
      patch update_accounting_filter_values_path, params: { ids: [a.id, b.id] }
    end

    assert_json_error(incluye: "Afine el filtro")
    refute a.reload.accounting_approved
    refute b.reload.accounting_approved
  end

  test "update_accounting_filter_values sin permiso Aprobar responde 403" do
    gasto = crear_gasto
    sign_in_as contador_solo_ingreso

    patch update_accounting_filter_values_path, params: { cost_center_id: @centro.id }

    assert_json_forbidden
    refute gasto.reload.accounting_approved
  end

  # --- download_file --------------------------------------------------------

  test "download_file sin permiso Exportar responde 403" do
    sign_in_as contador_solo_ingreso

    get "/download_file/accounting_expenses/todos"

    assert_json_forbidden
  end

  test "download_file con permiso responde xlsx" do
    crear_gasto
    sign_in_as @admin

    get "/download_file/accounting_expenses/todos"

    assert_response :success
    assert_equal "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                 response.media_type
  end

  test "download_file sin permiso de modulo responde 403" do
    sign_in_as users(:sin_permisos)

    get "/download_file/accounting_expenses/todos"

    assert_json_forbidden
  end

  private

  # Baja MAX_BULK para probar el desborde sin crear 501 gastos. La constante se
  # restaura siempre, incluso si el bloque lanza.
  def con_max_bulk(valor)
    original = AccountingExpensesController::MAX_BULK
    AccountingExpensesController.send(:remove_const, :MAX_BULK)
    AccountingExpensesController.const_set(:MAX_BULK, valor)
    yield
  ensure
    AccountingExpensesController.send(:remove_const, :MAX_BULK)
    AccountingExpensesController.const_set(:MAX_BULK, original)
  end
end

require "test_helper"
require "minitest/mock"

# Comprobante adjunto por la via web (paquete 06, tarea A5).
#
# ⚠️ FRONTERA CON EL PAQUETE 07 — leer antes de dar por incompletos estos tests.
#
# `app/serializers/report_expense_serializer.rb` y los strong params de
# `create`/`update` tienen dueño unico **07** (00-ARQUITECTURA §7.2). Hoy el
# serializer NO emite `receipt_file` y `report_expense_params_create/update` NO
# permiten `:receipt_file` ni `:remove_receipt_file`. Consecuencia: los tres
# casos de POST/PATCH multipart del documento del 06 (criterios 5 y 6) NO se
# pueden poner en verde desde aqui sin escribir en un archivo ajeno; el propio
# documento lo reconoce ("los criterios 5 y 6 de este paquete eran
# inalcanzables"). Quedan como criterio del 07.
#
# Lo que SI se prueba aqui es todo lo que este paquete si posee: las dos
# acciones nuevas con sus gates, el forzado de la descarga (§7.8) y —muy
# importante— que el endpoint de gastos NO deja escribir por mass-assignment los
# campos contables ni presupuestales.
class ReportExpensesReceiptTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    # `create`/`update` de gastos llaman a recalculate_cost_center, que hace
    # update sobre el centro y dispara CostCenter#change_state. Ese callback
    # multiplica hour_cotizada * eng_hours sin guarda de nil y revienta con las
    # fixtures tal cual vienen. Es deuda preexistente del legado (el archivo es
    # del paquete 01 y el callback del modelo CostCenter): se rellenan los dos
    # campos aqui en vez de tocar la fixture ajena.
    cost_centers(:centro_con_viaticos).update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
  end

  def crear_gasto(**overrides)
    as_user(@admin) do
      ReportExpense.create!({
        user: @admin,
        cost_center: cost_centers(:centro_con_viaticos),
        user_invoice: @ingeniero,
        invoice_name: "Hotel Web",
        invoice_date: Date.new(2026, 6, 1),
        description: "Alojamiento",
        invoice_number: "FE-W#{SecureRandom.hex(3)}",
        identification: "900111222",
        invoice_value: 100_000.0,
        invoice_tax: 19_000.0,
        invoice_total: 119_000.0
      }.merge(overrides))
    end
  end

  def gasto_con_comprobante(archivo = "comprobante.pdf", **overrides)
    gasto = crear_gasto(**overrides)
    gasto.receipt_file = upload_fixture(archivo)
    as_user(@admin) { gasto.save! }
    gasto
  end

  # Simula el entorno de PRODUCCION: el uploader guarda en fog y `url` devuelve
  # una URL firmada que acepta parametros de query. Se restaura siempre.
  def con_almacenamiento_remoto
    ReportExpensesController.class_eval do
      alias_method :remote_receipt_storage_real?, :remote_receipt_storage?
      define_method(:remote_receipt_storage?) { true }
    end
    ReceiptUploader.class_eval do
      alias_method :url_real, :url
      define_method(:url) do |options = {}|
        "https://controlmatica.s3.us-east-2.amazonaws.com/#{path}?#{options[:query].to_query}"
      end
    end
    yield
  ensure
    ReportExpensesController.class_eval do
      alias_method :remote_receipt_storage?, :remote_receipt_storage_real?
      remove_method :remote_receipt_storage_real?
    end
    ReceiptUploader.class_eval do
      alias_method :url, :url_real
      remove_method :url_real
    end
  end

  # --- create / update: retrocompatibilidad y mass-assignment ---------------

  test "POST sin archivo sigue funcionando con JSON" do
    # RETROCOMPATIBILIDAD: el endpoint no puede exigir multipart. Si lo hiciera,
    # el formulario actual y las tools MCP dejarian de crear gastos.
    sign_in_as @admin

    assert_difference "ReportExpense.count", 1 do
      post report_expenses_path, as: :json, params: {
        cost_center_id: cost_centers(:centro_con_viaticos).id,
        user_invoice_id: @ingeniero.id,
        invoice_name: "Sin comprobante",
        invoice_date: "2026-06-05",
        description: "Alojamiento",
        invoice_number: "FE-SIN-1",
        identification: "900111222",
        invoice_value: 50_000,
        invoice_tax: 0
      }
    end

    assert_json_success
  end

  test "PATCH no puede setear accounting_approved" do
    gasto = crear_gasto
    sign_in_as @admin

    patch report_expense_path(gasto), as: :json, params: { accounting_approved: true }

    refute gasto.reload.accounting_approved
  end

  test "PATCH no puede setear accounting_approved_by_id" do
    gasto = crear_gasto
    sign_in_as @admin

    patch report_expense_path(gasto), as: :json, params: { accounting_approved_by_id: @admin.id }

    assert_nil gasto.reload.accounting_approved_by_id
  end

  test "PATCH no puede setear budget_status" do
    # §2.1: budget_status lo escribe UNICAMENTE el servicio de consumo. Si el
    # endpoint lo aceptara, cualquiera podria fabricarse una aprobacion
    # presupuestal desde el navegador.
    #
    # SE MANDA UN VALOR IMPOSIBLE y no "aprobado". Desde que el paquete 07 cableo
    # ExpenseBudgetService en `update` (tarea 23), un PATCH sobre este gasto
    # queda LEGITIMAMENTE en "aprobado": el centro tiene partida vigente y cupo.
    # Con "aprobado" en el body el test no distinguia mass-assignment de calculo
    # correcto y pasaba por la razon equivocada. Con un centinela que el servicio
    # jamas escribe, lo unico que puede producirlo es el mass-assignment.
    gasto = crear_gasto
    sign_in_as @admin

    patch report_expense_path(gasto), as: :json, params: { budget_status: "valor_inventado" }

    assert_includes ExpenseBudgetService::MANAGED_STATUSES + [ExpenseBudgetService::STATUS_SIN_PRESUPUESTO],
                    gasto.reload.budget_status,
                    "budget_status quedo en un valor que el servicio no puede escribir: llego por mass-assignment"
    refute_equal "valor_inventado", gasto.budget_status
  end

  # --- delete_receipt -------------------------------------------------------

  test "DELETE delete_receipt sin permiso responde 403" do
    gasto = gasto_con_comprobante
    sign_in_as users(:sin_permisos)

    delete "/delete_receipt/report_expenses/#{gasto.id}"

    mensajes = assert_json_forbidden
    assert_equal "No tiene permiso para realizar esta acción", mensajes.first
    assert gasto.reload.receipt_file.present?, "sin permiso el comprobante no se toca"
  end

  test "DELETE delete_receipt sobre gasto sin comprobante responde error" do
    gasto = crear_gasto
    sign_in_as @admin

    delete "/delete_receipt/report_expenses/#{gasto.id}"

    # HTTP 200 con type error: es el patron viejo de esta app y el frontend lo
    # discrimina por `type`, no por el codigo.
    assert_json_error(incluye: "El gasto no tiene comprobante adjunto")
  end

  test "DELETE delete_receipt borra el archivo" do
    gasto = gasto_con_comprobante
    ruta = gasto.receipt_file.path
    sign_in_as @admin

    delete "/delete_receipt/report_expenses/#{gasto.id}"

    assert_json_success(mensaje: "¡El comprobante fue eliminado!")
    assert_nil gasto.reload.receipt_file_url
    refute File.exist?(ruta), "el archivo debe salir del almacenamiento, no solo de la columna"
  end

  test "DELETE delete_receipt deja RegisterEdit" do
    gasto = gasto_con_comprobante
    sign_in_as @admin

    assert_difference "RegisterEdit.count", 1 do
      delete "/delete_receipt/report_expenses/#{gasto.id}"
    end

    assert_match "Comprobante", RegisterEdit.last.description
  end

  # --- download_receipt -----------------------------------------------------

  test "GET download_receipt fuerza la descarga" do
    # CORRECCION 7 / §7.8. Sin esta cabecera el test E4.3 del paquete 12 se
    # cuelga 60 s esperando un evento `download` que nunca llega.
    gasto = gasto_con_comprobante
    sign_in_as @admin

    get "/download_receipt/report_expenses/#{gasto.id}"

    assert_response :success
    assert_includes response.headers["Content-Disposition"], "attachment"
    assert_includes response.headers["Content-Disposition"], "comprobante.pdf"
  end

  test "GET download_receipt responde un Content-Type visualizable" do
    # CORRECCION 9: el modal de previsualizacion del paquete 08 se monta sobre
    # esta misma URL, asi que el tipo no puede degradarse a octet-stream.
    gasto = gasto_con_comprobante
    sign_in_as @admin

    get "/download_receipt/report_expenses/#{gasto.id}"

    assert_equal "application/pdf", response.media_type
  end

  test "GET download_receipt con disposition=inline sirve el archivo para pintarlo" do
    # EL BUG QUE ESTO EVITA: el modal de previsualizacion salia EN BLANCO porque
    # el endpoint respondia siempre "attachment" y el navegador descarga en vez
    # de pintar. El modo inline es opt-in; el default sigue siendo la descarga
    # (lo fija el test de arriba, del que depende el escenario E4.3 del 12).
    gasto = gasto_con_comprobante
    sign_in_as @admin

    get "/download_receipt/report_expenses/#{gasto.id}", params: { disposition: "inline" }

    assert_response :success
    assert_includes response.headers["Content-Disposition"], "inline"
    refute_includes response.headers["Content-Disposition"], "attachment"
    assert_equal "application/pdf", response.media_type
  end

  test "GET download_receipt con un disposition cualquiera sigue forzando la descarga" do
    # La comparacion es contra la cadena exacta "inline": cualquier otro valor
    # —incluido uno inventado por quien manipule la URL— cae al default.
    gasto = gasto_con_comprobante
    sign_in_as @admin

    get "/download_receipt/report_expenses/#{gasto.id}", params: { disposition: "cualquier-cosa" }

    assert_includes response.headers["Content-Disposition"], "attachment"
  end

  test "la url firmada tambien propaga el modo inline" do
    gasto = gasto_con_comprobante
    sign_in_as @admin

    con_almacenamiento_remoto do
      get "/download_receipt/report_expenses/#{gasto.id}", params: { disposition: "inline" }
    end

    assert_response :redirect
    assert_includes CGI.unescape(response.location), 'inline; filename="comprobante.pdf"'
  end

  test "GET download_receipt redirige a la url firmada cuando el almacenamiento es remoto" do
    # En produccion el comprobante vive en S3: la accion tiene que REDIRIGIR a
    # una URL recien firmada, no servir el binario desde Rails.
    #
    # No se stubea `ReceiptUploader.storage` porque eso haria que el uploader
    # montado intentara LEER de fog y el archivo local desapareceria; se stubea
    # la rama del controller y se instrumenta `url` para ver que parametros
    # recibe, que es justo lo que el contrato §7.8 fija.
    gasto = gasto_con_comprobante
    sign_in_as @admin

    con_almacenamiento_remoto do
      get "/download_receipt/report_expenses/#{gasto.id}"
    end

    assert_response :redirect
    assert_includes response.location, "response-content-disposition"
    assert_includes CGI.unescape(response.location), 'attachment; filename="comprobante.pdf"'
  end

  test "GET download_receipt de otro usuario sin Ver todos responde 403" do
    # Gate de acceso al BINARIO: sin el, cualquiera con el id ve la factura de
    # otro. `ingeniero_dos` no es el responsable del gasto y su rol no tiene
    # "Gastos"/"Ver todos".
    gasto = gasto_con_comprobante
    revoke_permission!(rols(:ingeniero), "Gastos", "Ver todos")
    sign_in_as users(:ingeniero_dos)

    get "/download_receipt/report_expenses/#{gasto.id}"

    assert_json_forbidden
  end

  test "GET download_receipt lo permite al responsable del gasto aunque no tenga Ver todos" do
    gasto = gasto_con_comprobante
    revoke_permission!(rols(:ingeniero), "Gastos", "Ver todos")
    sign_in_as @ingeniero

    get "/download_receipt/report_expenses/#{gasto.id}"

    assert_response :success
  end

  test "GET download_receipt sin comprobante responde 404" do
    gasto = crear_gasto
    sign_in_as @admin

    get "/download_receipt/report_expenses/#{gasto.id}"

    assert_response :not_found
    assert_equal "error", json_body["type"]
  end

  test "destruir el gasto borra el comprobante" do
    gasto = gasto_con_comprobante
    ruta = gasto.receipt_file.path
    sign_in_as @admin

    delete report_expense_path(gasto)

    assert_json_success
    refute File.exist?(ruta)
  end
end

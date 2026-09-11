require "test_helper"

# Contrato del envio que introduce la tarea 11 del paquete 08: los DOS
# formularios de gasto pasaron de `JSON.stringify` a `FormData`.
#
# Es el cambio de mayor riesgo silencioso de todo el paquete: si el servidor no
# aceptara multipart, o si un campo vacio llegara como el string "undefined", el
# gasto se guardaria igual —con ceros, sin comprobante y sin error visible—. Por
# eso el contrato se prueba desde afuera, mandando exactamente lo que manda el
# navegador.
#
# Todos los write van envueltos en `as_user`: los callbacks de auditoria de
# ReportExpense leen `User.current` y sin el revientan con NoMethodError.
class ExpenseFormMultipartTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    @centro = cost_centers(:centro_con_viaticos)

    # `create`/`update` de gastos llaman a recalculate_cost_center, que dispara
    # CostCenter#change_state; ese callback multiplica hour_cotizada * eng_hours
    # sin guarda de nil y revienta con las fixtures tal cual vienen. Es deuda
    # preexistente del legado (mismo apaño que usa report_expenses_receipt_test).
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
  end

  # Exactamente los campos y el orden que arma `HandleClick` / `handleSubmit`.
  # Los vacios van como "" y NUNCA se omiten, porque FormData siempre los manda.
  def form_params(**overrides)
    {
      # Obligatorio desde 2026-09-10. Los tests que prueban su AUSENCIA lo
      # quitan con `receipt_file: nil`.
      receipt_file: upload_fixture("comprobante.pdf"),
      cost_center_id: @centro.id,
      user_invoice_id: @ingeniero.id,
      invoice_name: "Hotel Multipart",
      invoice_date: "2026-06-01",
      description: "Alojamiento",
      invoice_number: "FE-MP-#{SecureRandom.hex(3)}",
      identification: "900111222",
      invoice_type: "",
      invoice_value: "100000",
      invoice_tax: "19000",
      invoice_total: "119000",
      type_identification_id: "",
      payment_type_id: "",
      currency: "COP",
      foreign_value: "",
      foreign_tax: "",
      foreign_total: "",
      exchange_rate: "",
      exchange_rate_date: "",
      exchange_rate_source: "",
      cop_manual_override: "false",
      # `.compact` para que `receipt_file: nil` signifique NO MANDAR la clave.
      # Mandarla en nil es otra cosa: el controller lo lee como "borra el
      # comprobante", que es justo lo que el test de conservacion no quiere.
    }.merge(overrides).compact
  end

  test "crea un gasto enviado como multipart form data" do
    sign_in_as @admin

    as_user(@admin) do
      # SIN `as: :json`: esto es un POST multipart de verdad, con boundary, que
      # es lo unico que puede llevar el archivo.
      post report_expenses_path,
           params: form_params(receipt_file: upload_fixture("comprobante.pdf"))
    end

    registro = assert_json_success
    assert registro, "La respuesta debe traer el register serializado"

    gasto = ReportExpense.order(:id).last
    assert gasto.receipt_file.present?, "El comprobante no se guardo: revisar strong params y el boundary"
    assert gasto.receipt_file.url.present?
    assert_equal "Hotel Multipart", gasto.invoice_name
  end

  test "un gasto multipart SIN archivo adjunto se rechaza" do
    con_comprobante_obligatorio do
      # LA REGLA SE INVIRTIO (2026-09-10). Este test afirmaba que el multipart sin
      # archivo creaba el gasto igual, y eso era justamente el hueco: un gasto sin
      # soporte no lo puede causar contabilidad, asi que registrarlo solo aplaza el
      # problema al cierre, cuando ya nadie se acuerda de que factura era.
      sign_in_as @admin

      assert_no_difference -> { ReportExpense.count } do
        post report_expenses_path, params: form_params(receipt_file: nil)
      end

      assert_response :success
      cuerpo = JSON.parse(response.body)
      assert_equal "error", cuerpo["type"]
      assert_match(/comprobante/i, Array(cuerpo["message"]).join(" "))
    end
  end

  test "los campos vacios enviados como string vacio no rompen el create" do
    sign_in_as @admin

    as_user(@admin) do
      post report_expenses_path,
           params: form_params(currency: "", foreign_value: "", exchange_rate: "", exchange_rate_date: "")
    end

    assert_json_success
    gasto = ReportExpense.order(:id).last
    # `currency: ""` no puede dejar la columna en blanco: el default de columna
    # (COP) tiene que ganar, porque la tabla y los exportables agrupan por ahi.
    assert_equal "COP", gasto.currency
    assert_nil gasto.exchange_rate
  end

  test "el register de la respuesta trae las claves que la tabla pinta" do
    sign_in_as @admin
    as_user(@admin) { post report_expenses_path, params: form_params }

    registro = assert_json_success
    %w[budget_status budget_reason currency receipt_file].each do |clave|
      assert_includes registro.keys, clave,
                      "El serializer debe emitir #{clave.inspect}: la columna lo lee por nombre"
    end
  end

  test "un archivo .exe es rechazado" do
    sign_in_as @admin
    antes = ReportExpense.count

    as_user(@admin) do
      post report_expenses_path, params: form_params(receipt_file: upload_fixture("malicioso.exe"))
    end

    assert_json_error
    assert_equal antes, ReportExpense.count,
                 "Un ejecutable no puede crear el gasto ni a medias"
  end

  test "no se puede setear budget_status por mass assignment" do
    sign_in_as @admin

    # "aprobado" es un valor que el servicio NO puede escribir aqui: el
    # ingeniero tiene partida en este centro pero el gasto excede o encaja segun
    # el cupo, y en ningun caso lo decide el cliente.
    as_user(@admin) { post report_expenses_path, params: form_params(budget_status: "aprobado", budget_reason: "porque si") }

    assert_json_success
    gasto = ReportExpense.order(:id).last
    refute_equal "porque si", gasto.budget_reason,
                 "budget_reason lo escribe ExpenseBudgetService, no el formulario"
    assert_includes [ExpenseBudgetService::STATUS_SIN_PRESUPUESTO,
                     ExpenseBudgetService::STATUS_APROBADO,
                     ExpenseBudgetService::STATUS_EXCEDIDO], gasto.budget_status

    # Lo importante no es CUAL estado quedo, sino que lo decidio el servicio y no
    # el parametro. El ingeniero tiene 700.000 asignados en este centro y este
    # gasto de 100.000 cabe: el calculo correcto es "aprobado". Que coincida con
    # el valor enviado seria una casualidad peligrosa, asi que se comprueba
    # tambien con un valor que el servicio NUNCA puede producir.
    assert_equal ExpenseBudgetService::STATUS_APROBADO, gasto.budget_status,
                 "El gasto cabe en la partida del ingeniero: el servicio debe aprobarlo"

    as_user(@admin) do
      post report_expenses_path, params: form_params(budget_status: "inventado")
    end
    assert_json_success
    refute_equal "inventado", ReportExpense.order(:id).last.budget_status,
                 "budget_status llego por mass assignment: el cliente puede escribir cualquier cosa"
  end

  test "no se puede setear accounting_approved por mass assignment" do
    sign_in_as @admin

    as_user(@admin) do
      post report_expenses_path,
           params: form_params(accounting_approved: "true", accounting_approved_by_id: @admin.id)
    end

    assert_json_success
    gasto = ReportExpense.order(:id).last
    assert_equal false, gasto.accounting_approved,
                 "La aprobacion contable solo se otorga desde la pantalla de Contabilidad"
    assert_nil gasto.accounting_approved_by_id
  end

  test "actualiza un gasto por multipart conservando el comprobante existente" do
    gasto = as_user(@admin) do
      registro = ReportExpense.create!(
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        omitir_comprobante_obligatorio: true,
        user: @admin, cost_center: @centro, user_invoice: @ingeniero,
        invoice_name: "Con comprobante", invoice_date: Date.new(2026, 6, 1),
        invoice_number: "FE-KEEP-#{SecureRandom.hex(3)}", identification: "900111222",
        invoice_value: 50_000.0, invoice_tax: 0.0, invoice_total: 50_000.0
      )
      registro.receipt_file = upload_fixture("comprobante.pdf")
      registro.save!
      registro
    end

    nombre_original = gasto.receipt_file.file.filename
    sign_in_as @admin

    # PATCH SIN receipt_file: es lo que manda el formulario cuando la persona
    # edita el nombre y no toca el archivo. Si el controller hiciera
    # `update(receipt_file: nil)` el comprobante desapareceria en silencio.
    as_user(@admin) do
      # `receipt_file: nil` es la premisa del test: el formulario manda el PATCH
      # sin archivo cuando la persona edita el nombre y no toca el comprobante.
      # Desde que `form_params` adjunta uno por defecto hay que quitarlo aqui.
      patch report_expense_path(gasto), params: form_params(invoice_name: "Nombre editado", receipt_file: nil)
    end

    assert_json_success
    gasto.reload
    assert gasto.receipt_file.present?, "El PATCH sin archivo borro el comprobante existente"
    assert_equal nombre_original, gasto.receipt_file.file.filename
    assert_equal "Nombre editado", gasto.invoice_name
  end
end

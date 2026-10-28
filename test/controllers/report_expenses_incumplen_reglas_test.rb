require "test_helper"
require "minitest/mock"

# La pestaña «Incumplen reglas» de Gastos y el cotejo del comprobante al
# guardar por la web (2026-10-25).
#
#   * Quien ve la pestaña y que ve en ella: «Ver todos» todo; el propietario de
#     un centro, lo de sus centros.
#   * Los filtros de regla y de estado, que tambien respetan el Excel y
#     «Aceptar gastos» porque viven en el mismo recorte.
#   * Al guardar, la IA lee el comprobante una sola vez, y ninguna si la lectura
#     de «Extraer datos» llega firmada para ese mismo archivo.
class ReportExpensesIncumplenReglasTest < ActionDispatch::IntegrationTest
  include WithFakeExtractor

  ENV_CLAVES = %w[ANTHROPIC_API_KEY RECEIPT_EXTRACTION_ENABLED].freeze

  setup do
    @env_previo = ENV.to_hash.slice(*ENV_CLAVES)
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    @centro = cost_centers(:centro_con_viaticos) # su propietario es dueno_centro
    [@centro, cost_centers(:centro_ajeno)].each { |c| c.update_columns(hour_cotizada: 0.0, eng_hours: 0.0) }
    ExpenseRule.update_all(active: false)
  end

  teardown do
    ENV_CLAVES.each { |k| @env_previo.key?(k) ? ENV[k] = @env_previo[k] : ENV.delete(k) }
  end

  def regla!(**attrs)
    as_user(@admin) do
      ExpenseRule.create!({ active: true, applies_to_all_roles: true, check_duplicates: false,
                            mandatory: false }.merge(attrs))
    end
  end

  def gasto!(**attrs)
    as_user(@admin) do
      ReportExpense.create!({ cost_center_id: @centro.id, user_invoice_id: @ingeniero.id, invoice_name: "Hotel",
                              invoice_date: Date.current, description: "Alojamiento",
                              invoice_number: "FE-#{SecureRandom.hex(3)}", identification: "900123456",
                              invoice_value: 700_000, invoice_tax: 0, invoice_total: 700_000,
                              type_identification_id: report_expense_options(:opcion_tipo).id,
                              omitir_comprobante_obligatorio: true }.merge(attrs))
    end
  end

  def lista(params = {})
    get get_report_expenses_path, params: { scope: "rule_hits" }.merge(params)
    assert_response :success
    JSON.parse(response.body)["data"]
  end

  def ids(params = {}) = lista(params).map { |g| g["id"] }

  def encender_lectura!
    ENV["ANTHROPIC_API_KEY"]          = "sk-ant-de-mentira-no-se-usa"
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "true"
  end

  def react_props
    JSON.parse(css_select("div[data-react-class]").first["data-react-props"])
  end

  # --- La pestaña --------------------------------------------------------------

  test "la pestaña trae solo los gastos que incumplieron una regla, con la regla, la razon y quien decidio" do
    regla!(name: "Tope 500 mil", max_invoice_value: 500_000)
    incumple = gasto!
    cumple = gasto!(invoice_value: 100_000, invoice_total: 100_000)
    sign_in_as @admin

    filas = lista
    assert_includes filas.map { |g| g["id"] }, incumple.id
    refute_includes filas.map { |g| g["id"] }, cumple.id

    reporte = filas.find { |g| g["id"] == incumple.id }["rules_report"]
    assert_equal [{ "rule_id" => incumple.rule_hits.first.expense_rule_id, "rule" => "Tope 500 mil",
                    "code" => "invoice_value_exceeded", "message" => "El valor supera el tope de $500.000" }],
                 reporte["hits"]
  end

  test "las otras pestañas no cargan las reglas" do
    regla!(name: "Tope 500 mil", max_invoice_value: 500_000)
    gasto!
    sign_in_as @admin

    get get_report_expenses_path, params: { scope: "all" }

    assert JSON.parse(response.body)["data"].all? { |g| g["rules_report"].nil? }
  end

  test "se filtra por regla" do
    valor = regla!(name: "Tope 500 mil", max_invoice_value: 500_000)
    antiguedad = regla!(name: "Máximo 5 días", max_invoice_age_days: 5)
    caro = gasto!
    viejo = gasto!(invoice_value: 100_000, invoice_total: 100_000, invoice_date: 20.days.ago.to_date)
    sign_in_as @admin

    assert_equal [caro.id], ids(rule_id: valor.id) & [caro.id, viejo.id]
    assert_equal [viejo.id], ids(rule_id: antiguedad.id) & [caro.id, viejo.id]
  end

  # Aprobar no saca el gasto del informe: lo pasa de pendientes a aprobados.
  test "abre en pendientes, y lo aprobado y lo rechazado se ven con su filtro" do
    regla!(name: "Tope 500 mil", max_invoice_value: 500_000)
    pendiente = gasto!
    aprobado = gasto!
    rechazado = gasto!
    as_user(@admin) do
      aprobado.update!(operational_state: ReportExpense::STATE_ACEPTADO)
      rechazado.rechazar(actor: @admin, motivo: "No corresponde")
      rechazado.save!
    end
    sign_in_as @admin

    nuestros = [pendiente.id, aprobado.id, rechazado.id]
    assert_equal [pendiente.id], ids & nuestros
    assert_equal [aprobado.id], ids(rule_state: "aprobados") & nuestros
    assert_equal [rechazado.id], ids(rule_state: "rechazados") & nuestros
    assert_equal nuestros.sort, (ids(rule_state: "todos") & nuestros).sort

    fila = lista(rule_state: "aprobados").find { |g| g["id"] == aprobado.id }
    assert_equal @admin.id, fila.dig("rules_report", "first_by", "id")
    fila = lista(rule_state: "rechazados").find { |g| g["id"] == rechazado.id }
    assert_equal "No corresponde", fila.dig("rules_report", "rejection_reason")
  end

  # dueno_centro no tiene «Ver todos»: ve lo de su centro aunque no sea suyo, y
  # nada de un centro ajeno.
  test "el propietario ve los de sus centros y no los ajenos" do
    regla!(name: "Tope 500 mil", max_invoice_value: 500_000)
    del_centro = gasto!
    ajeno = gasto!(cost_center_id: cost_centers(:centro_ajeno).id)
    sign_in_as users(:dueno_centro)

    visibles = ids
    assert_includes visibles, del_centro.id
    refute_includes visibles, ajeno.id
  end

  # «Aceptar gastos» acepta por filtro, no por pagina: desde esta pestaña tiene
  # que aceptar lo que la pestaña muestra y nada mas.
  test "Aceptar gastos desde la pestaña acepta solo los que incumplen la regla filtrada" do
    tope = regla!(name: "Tope 500 mil", max_invoice_value: 500_000)
    regla!(name: "Máximo 5 días", max_invoice_age_days: 5)
    caro = gasto!
    viejo = gasto!(invoice_value: 100_000, invoice_total: 100_000, invoice_date: 20.days.ago.to_date)
    sin_reglas = gasto!(invoice_value: 100_000, invoice_total: 100_000)
    sign_in_as @admin

    patch update_filter_values_path, params: { scope: "rule_hits", rule_id: tope.id, rule_state: "pendientes" }

    assert_response :success
    assert caro.reload.aceptado?
    refute viejo.reload.aceptado?, "acepto uno de otra regla"
    refute sin_reglas.reload.aceptado?, "acepto uno que no incumple ninguna regla"
  end

  test "la pestaña y sus reglas llegan a quien tiene algo que revisar" do
    regla!(name: "Tope 500 mil", max_invoice_value: 500_000)

    sign_in_as @admin
    get report_expenses_path
    estados = react_props["estados"]
    assert_equal true, estados["rule_hits_tab"]
    assert_includes estados["rule_options"].map { |o| o["label"] }, "Tope 500 mil"

    sign_in_as @ingeniero
    get report_expenses_path
    assert_equal false, react_props["estados"]["rule_hits_tab"]
  end

  # --- El cotejo al guardar por la web --------------------------------------------

  def parametros(**extra)
    { receipt_file: upload_fixture("comprobante_factura.pdf"), cost_center_id: @centro.id,
      user_invoice_id: @ingeniero.id, invoice_name: "Distribuidora El Sol", invoice_date: "2026-07-14",
      invoice_number: "FE-4821", identification: "900123456", invoice_value: 420_168, invoice_tax: 79_832,
      invoice_total: 500_000, type_identification_id: report_expense_options(:opcion_tipo).id }.merge(extra)
  end

  def crear(params)
    post report_expenses_path, params: params
    assert_response :success
    JSON.parse(response.body)
  end

  test "un comprobante que no cuadra se guarda, queda pendiente y dice por que" do
    encender_lectura!
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    sign_in_as @admin

    with_fake_extractor(payload_modelo) do |fake|
      cuerpo = crear(parametros(invoice_value: 600_000, invoice_tax: 0, invoice_total: 600_000))

      assert_equal "success", cuerpo["type"]
      assert_equal 1, fake.calls.size
    end
    registro = ReportExpense.order(:id).last
    refute registro.aceptado?
    assert_equal ["El total del comprobante es $500.000 y se registró $600.000"],
                 registro.rule_hits.map(&:message)
  end

  test "si cuadra no queda nada que revisar" do
    encender_lectura!
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    sign_in_as @admin

    with_fake_extractor(payload_modelo) { crear(parametros) }

    registro = ReportExpense.order(:id).last
    assert_equal "coincide", registro.receipt_check["estado"]
    assert_empty registro.rule_hits
  end

  test "la lectura de Extraer datos se reusa al guardar y la IA lee una sola vez" do
    encender_lectura!
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    sign_in_as @admin

    with_fake_extractor(payload_modelo) do |fake|
      post "/extract_receipt/report_expenses", params: { file: upload_fixture("comprobante_factura.pdf"),
                                                         user_invoice_id: @ingeniero.id }
      token = JSON.parse(response.body)["reading_token"]
      assert token.present?

      crear(parametros(receipt_reading: token, invoice_total: 600_000, invoice_value: 600_000, invoice_tax: 0))

      assert_equal 1, fake.calls.size, "el comprobante se leyo dos veces"
    end
    assert_equal ["El total del comprobante es $500.000 y se registró $600.000"],
                 ReportExpense.order(:id).last.rule_hits.map(&:message)
  end

  # La firma va atada a los bytes: la lectura de un comprobante no sirve para
  # guardar otro.
  test "una lectura firmada de otro archivo no se usa" do
    encender_lectura!
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    sign_in_as @admin
    ajena = CotejoDelComprobante.token({ "estado" => "leido", "campos" => { "total" => "600000" } }, "otro archivo")

    with_fake_extractor(payload_modelo) do |fake|
      crear(parametros(receipt_reading: ajena, invoice_total: 600_000, invoice_value: 600_000, invoice_tax: 0))

      assert_equal 1, fake.calls.size
    end
    refute_empty ReportExpense.order(:id).last.rule_hits
  end

  test "sin comprobante el gasto queda para revision" do
    encender_lectura!
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    sign_in_as @admin

    with_fake_extractor(payload_modelo) do |fake|
      crear(parametros.except(:receipt_file))
      assert_empty fake.calls
    end
    assert_equal ["No se pudo cotejar el comprobante: el gasto no tiene comprobante"],
                 ReportExpense.order(:id).last.rule_hits.map(&:message)
  end

  test "con la lectura apagada no se coteja nada" do
    encender_lectura!
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "false"
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    sign_in_as @admin

    with_fake_extractor(payload_modelo) do |fake|
      crear(parametros(invoice_total: 600_000, invoice_value: 600_000, invoice_tax: 0))
      assert_empty fake.calls
    end
    assert_empty ReportExpense.order(:id).last.rule_hits
  end

  # Revision del 2026-10-25: el veredicto viaja como JSON sin firma, y uno que
  # llegue al editar sin comprobante nuevo no habla de ningun comprobante.
  test "un veredicto mandado al editar sin comprobante nuevo no saca del informe lo que encontro la IA" do
    licor = regla!(name: "Sin licor", agent_instructions: "No se aceptan bebidas alcohólicas.")
    registro = gasto!(agent_policy_verdict: { compliant: false,
                                              findings: [{ rule_id: licor.id, message: "Incluye cerveza" }] })
    sign_in_as @admin

    patch report_expense_path(registro), params: { description: "Cena", policy_verdict: { compliant: true }.to_json }

    assert_response :success
    assert_equal ["Incluye cerveza"], registro.reload.rule_hits.map(&:message)
  end

  test "si la lectura revienta a mitad de camino, el gasto queda para revision" do
    encender_lectura!
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    sign_in_as @admin

    ReceiptExtractionService.stub(:extract, ->(*) { raise "fallo inesperado" }) do
      assert_equal "success", crear(parametros)["type"]
    end
    assert_equal ["No se pudo cotejar el comprobante: la lectura automática no respondió"],
                 ReportExpense.order(:id).last.rule_hits.map(&:message)
  end

  test "al editar con un comprobante nuevo que no cuadra se lee y queda en el informe" do
    encender_lectura!
    regla!(name: "Discrepancia en el recibo", cross_check_receipt: true)
    registro = gasto!(invoice_value: 420_168, invoice_tax: 79_832, invoice_total: 500_000,
                      invoice_date: Date.new(2026, 7, 14), invoice_number: "FE-4821")
    sign_in_as @admin

    with_fake_extractor(payload_modelo("total" => 450_000.0, "value" => 370_168.0)) do |fake|
      patch report_expense_path(registro), params: { receipt_file: upload_fixture("comprobante_factura.pdf") }
      assert_response :success
      assert_equal 1, fake.calls.size
    end
    assert_equal ["El valor antes de IVA del comprobante es $370.168 y se registró $420.168",
                  "El total del comprobante es $450.000 y se registró $500.000"],
                 registro.reload.rule_hits.map(&:message)
  end
end

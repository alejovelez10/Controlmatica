require "test_helper"
require "minitest/mock"

# El veredicto del agente regla por regla, y el comprobante que se juzga al
# guardar cuando nadie lo juzgo (2026-10-14).
#
# El caso real: "sin licor, excepto en representacion". En la web el agente lee
# el comprobante ANTES de que se elija el tipo de gasto, asi que juzga contra las
# reglas de todos los tipos. Cada hallazgo vuelve con la regla de la que salio, y
# al guardar —con el tipo ya elegido— el servidor suelta los de las reglas que no
# aplican a ese gasto.
class ReportExpensesJuicioPorReglaTest < ActionDispatch::IntegrationTest
  include WithFakeExtractor

  ENV_CLAVES = %w[ANTHROPIC_API_KEY RECEIPT_EXTRACTION_ENABLED].freeze

  setup do
    @env_previo = ENV.to_hash.slice(*ENV_CLAVES)
    @admin     = users(:admin)
    @ingeniero = users(:ingeniero)
    @centro    = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
    ReportExpense.update_all(is_acepted: true, operational_state: ReportExpense::STATE_ACEPTADO)
    ExpenseRule.update_all(active: false)

    @alimentacion   = report_expense_options(:opcion_tipo)
    @representacion = ReportExpenseOption.create!(name: "Representación", category: "Tipo", user_id: @admin.id)

    @sin_licor = regla!(name: "Sin licor", agent_instructions: "No se aceptan bebidas alcohólicas.",
                        excluded_types: [@representacion])
    @propinas  = regla!(name: "Propinas", agent_instructions: "Las propinas no pueden superar el 10%.",
                        mandatory: false)
    sign_in_as @admin
  end

  teardown do
    ENV_CLAVES.each { |k| @env_previo.key?(k) ? ENV[k] = @env_previo[k] : ENV.delete(k) }
  end

  def regla!(included_types: [], excluded_types: [], **attrs)
    as_user(@admin) do
      r = ExpenseRule.new({ active: true, applies_to_all_roles: true, check_duplicates: false,
                            mandatory: true }.merge(attrs))
      r.included_types = included_types
      r.excluded_types = excluded_types
      r.save!
      r
    end
  end

  def encender_lectura!
    ENV["ANTHROPIC_API_KEY"]          = "sk-ant-de-mentira-no-se-usa"
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "true"
  end

  def gasto(tipo, **extra)
    { receipt_file: upload_fixture("comprobante.pdf"), cost_center_id: @centro.id,
      user_invoice_id: @ingeniero.id, invoice_name: "Restaurante", invoice_date: Date.current.to_s,
      invoice_number: "FE-J#{SecureRandom.hex(3)}", identification: "900111222",
      invoice_value: 100_000, invoice_tax: 0, invoice_total: 100_000,
      type_identification_id: tipo.id }.merge(extra)
  end

  def veredicto(hallazgos, juzgadas: [@sin_licor.id, @propinas.id], cumple: false)
    { compliant: cumple, judged_rule_ids: juzgadas,
      findings: hallazgos.map { |regla, motivo| { rule_id: regla&.id, message: motivo } } }.to_json
  end

  def crear(params)
    post report_expenses_path, params: params
    assert_response :success
    JSON.parse(response.body)
  end

  # --- Al guardar, con el veredicto que trae la pantalla ----------------------

  test "el licor no frena un gasto de representacion" do
    cuerpo = crear(gasto(@representacion, policy_verdict: veredicto([[@sin_licor, "Incluye cerveza"]])))

    assert_equal "success", cuerpo["type"], cuerpo["message"].inspect
  end

  test "el licor si frena un gasto de alimentacion" do
    cuerpo = crear(gasto(@alimentacion, policy_verdict: veredicto([[@sin_licor, "Incluye cerveza"]])))

    assert_equal "error", cuerpo["type"]
    assert_includes cuerpo["message"].join, "Incluye cerveza"
  end

  # Antes cualquier hallazgo frenaba si ALGUNA regla obligatoria tenia texto.
  test "un hallazgo de una regla blanda no frena aunque otra obligatoria tenga texto" do
    cuerpo = crear(gasto(@alimentacion, policy_verdict: veredicto([[@propinas, "Propina del 15%"]])))

    assert_equal "success", cuerpo["type"], cuerpo["message"].inspect
    registro = ReportExpense.order(:id).last
    assert_includes registro.rule_violations.map { |v| v["message"] }, "Propina del 15%"
    assert_includes registro.rule_violations.map { |v| v["rule"] }, "Propinas"
  end

  test "un hallazgo sin regla sigue frenando como antes" do
    cuerpo = crear(gasto(@alimentacion, policy_verdict: veredicto([[nil, "Algo no cumple"]])))

    assert_equal "error", cuerpo["type"]
  end

  # --- Al guardar, cuando nadie juzgo el comprobante -------------------------

  test "sin veredicto, el comprobante se juzga al guardar" do
    encender_lectura!
    respuesta = payload_modelo("policy_compliant" => false,
                               "policy_findings" => [{ "rule_id" => @sin_licor.id, "reason" => "Incluye vino" }])

    with_fake_extractor(respuesta) do |fake|
      cuerpo = crear(gasto(@alimentacion))

      assert_equal 1, fake.calls.size
      texto = fake.calls.first[:messages].first[:content].last[:text]
      assert_includes texto, "[Regla #{@sin_licor.id} · Sin licor]"
      assert_includes texto, "«Alimentacion»"
      assert_equal "error", cuerpo["type"]
      assert_includes cuerpo["message"].join, "Incluye vino"
    end
  end

  test "si el veredicto ya cubre las reglas que aplican, no se vuelve a llamar al agente" do
    encender_lectura!

    with_fake_extractor(payload_modelo) do |fake|
      cuerpo = crear(gasto(@alimentacion, policy_verdict: veredicto([], cumple: true)))

      assert_equal "success", cuerpo["type"]
      assert_empty fake.calls
    end
  end

  # El responsable se cambio despues de leer: hay una regla que el agente no vio.
  test "si falta juzgar una regla que aplica, se vuelve a juzgar" do
    encender_lectura!

    with_fake_extractor(payload_modelo("policy_compliant" => true)) do |fake|
      crear(gasto(@alimentacion, policy_verdict: veredicto([], cumple: true, juzgadas: [@propinas.id])))

      assert_equal 1, fake.calls.size
    end
  end

  test "con la lectura caida el gasto se guarda igual" do
    encender_lectura!

    with_fake_extractor(Net::ReadTimeout) do
      assert_equal "success", crear(gasto(@alimentacion))["type"]
    end
  end

  test "con la lectura apagada no se llama al agente" do
    encender_lectura!
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "false"

    with_fake_extractor(payload_modelo) do |fake|
      assert_equal "success", crear(gasto(@alimentacion))["type"]
      assert_empty fake.calls
    end
  end

  # --- La lectura del comprobante ------------------------------------------------

  test "sin tipo, la lectura juzga las reglas de todos los tipos y dice de que regla sale cada hallazgo" do
    encender_lectura!
    solo_repr = regla!(name: "Solo representación", agent_instructions: "Máximo dos botellas.",
                       included_types: [@representacion])
    respuesta = payload_modelo("policy_compliant" => false,
                               "policy_findings" => [{ "rule_id" => @sin_licor.id, "reason" => "Incluye cerveza" }])

    with_fake_extractor(respuesta) do |fake|
      post "/extract_receipt/report_expenses", params: { file: upload_fixture("comprobante_factura.pdf"),
                                                         user_invoice_id: @ingeniero.id }

      texto = fake.calls.first[:messages].first[:content].last[:text]
      assert_includes texto, "[Regla #{solo_repr.id} · Solo representación]"
      policy = JSON.parse(response.body)["policy"]
      assert_includes policy["judged_rule_ids"], solo_repr.id
      assert_equal [{ "rule_id" => @sin_licor.id, "message" => "Incluye cerveza" }], policy["findings_detail"]
      assert_equal true, policy["blocking"]
      regla_licor = policy["rules"].find { |r| r["id"] == @sin_licor.id }
      assert_equal [@representacion.id], regla_licor["excluded_type_ids"]
    end
  end

  test "con el tipo elegido, la lectura solo juzga las reglas de ese tipo" do
    encender_lectura!

    with_fake_extractor(payload_modelo) do |fake|
      post "/extract_receipt/report_expenses", params: { file: upload_fixture("comprobante_factura.pdf"),
                                                         user_invoice_id: @ingeniero.id,
                                                         type_identification_id: @representacion.id }

      texto = fake.calls.first[:messages].first[:content].last[:text]
      assert_not_includes texto, "Sin licor"
      assert_includes texto, "«Representación»"
    end
  end
end

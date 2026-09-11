require "test_helper"
require "minitest/mock"

# POST /extract_receipt/report_expenses (contrato D.1, paquete 10 §14).
#
# CERO RED: el seam call_vision_model se reemplaza con with_fake_extractor y la
# tasa de cambio se stubea en ExchangeRateService.fetch (el controller es su
# unico consumidor aqui). Lo que se prueba es la orquestacion: permiso, mapeo a
# las 15 claves de la whitelist del frontend, conversion de moneda multiplicando
# (invariante 3), warnings, reglas informativas y que NADA se persiste.
class ReportExpensesExtractReceiptTest < ActionDispatch::IntegrationTest
  include WithFakeExtractor

  ENV_CLAVES = %w[TAIMES_INVOKE_URL TAIMES_AGENT_ID TAIMES_API_KEY
                  RECEIPT_EXTRACTION_ENABLED].freeze

  RUTA = "/extract_receipt/report_expenses".freeze

  setup do
    @env_previo = ENV.to_hash.slice(*ENV_CLAVES)
    ENV["TAIMES_INVOKE_URL"]          = "http://taimes.invalid"
    ENV["TAIMES_AGENT_ID"]            = "agente-extractor"
    ENV["TAIMES_API_KEY"]             = "kmz_de-mentira"
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "true"

    @admin = users(:admin)
    # Deuda preexistente del legado (mismo apunte que report_expenses_receipt_test):
    # los callbacks de CostCenter multiplican hour_cotizada * eng_hours sin
    # guarda de nil y revientan con la fixture tal cual.
    cost_centers(:centro_con_viaticos).update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
  end

  teardown do
    ENV_CLAVES.each do |clave|
      @env_previo.key?(clave) ? ENV[clave] = @env_previo[clave] : ENV.delete(clave)
    end
  end

  # Las 15 claves que el frontend puede precargar (whitelist de handleExtract).
  CLAVES_FIELDS = %w[invoice_name identification invoice_number invoice_date description
                     currency foreign_value foreign_tax foreign_total
                     exchange_rate exchange_rate_date exchange_rate_source
                     invoice_value invoice_tax invoice_total].freeze

  def post_extraccion(archivo: "comprobante_factura.pdf", **extra)
    params = extra
    params[:file] = upload_fixture(archivo) if archivo
    post RUTA, params: params
  end

  def tasa_ok(rate: "4120.5", fecha: Date.new(2026, 7, 14), rate_date: nil, source: "trm_oficial")
    ExchangeRateService::Result.new(
      ok: true, errors: [],
      value: ExchangeRateService::Rate.new(
        currency: "USD", requested_date: fecha, rate_date: rate_date || fecha,
        rate_to_cop: BigDecimal(rate), source: source, cached: false,
        stale: (rate_date || fecha) != fecha
      )
    )
  end

  def con_tasa(resultado, &bloque)
    ExchangeRateService.stub(:fetch, ->(*_a, **_k) { resultado }, &bloque)
  end

  # ---- permiso y validacion de entrada --------------------------------------

  test "sin permiso responde 403 y no llama la IA" do
    sign_in_as(user_without_permissions)

    with_fake_extractor(payload_modelo) do |fake|
      post_extraccion

      assert_json_forbidden
      assert_empty fake.calls
    end
  end

  test "el permiso Gastos/Crear basta sin ser admin" do
    ingeniero = users(:ingeniero)
    grant_permission!(ingeniero.rol, "Gastos", "Crear")
    sign_in_as(ingeniero)

    with_fake_extractor(payload_modelo) do
      post_extraccion

      assert_equal "success", json_body["type"]
    end
  end

  test "sin archivo devuelve error sin llamar la IA" do
    sign_in_as(@admin)

    with_fake_extractor(payload_modelo) do |fake|
      post_extraccion(archivo: nil)

      assert_json_error(incluye: "Debe adjuntar un comprobante")
      assert_empty fake.calls
    end
  end

  # ---- camino feliz COP -----------------------------------------------------

  test "exito COP: las 15 claves, provider_name mapeado y fecha ISO" do
    sign_in_as(@admin)

    with_fake_extractor(payload_modelo) do
      post_extraccion

      body   = json_body
      fields = body["fields"]

      assert_equal "success", body["type"]
      assert_equal CLAVES_FIELDS.sort, fields.keys.sort
      assert_equal "Distribuidora El Sol SAS", fields["invoice_name"]
      assert_equal "9001234567", fields["identification"]
      assert_equal "2026-07-14", fields["invoice_date"]
      assert_in_delta 420_168.0, fields["invoice_value"]
      assert_in_delta 500_000.0, fields["invoice_total"]
      assert_nil fields["foreign_value"]
      assert_nil fields["exchange_rate"]
      assert_equal [], body["warnings"]
      # Sin `rule_violations`: la extraccion ya no evalua reglas (ver abajo).
      refute body.key?("rule_violations")
      assert_kind_of Hash, body["confidence"]
    end
  end

  test "el centro de costos del formulario viaja como contexto al servicio" do
    sign_in_as(@admin)
    centro = cost_centers(:centro_con_viaticos)

    with_fake_extractor(payload_modelo) do |fake|
      post_extraccion(cost_center_id: centro.id)

      texto = fake.calls.first[:messages].first[:content].last[:text]
      assert_includes texto, centro.code
    end
  end

  test "nada se persiste en una extraccion exitosa" do
    sign_in_as(@admin)

    with_fake_extractor(payload_modelo) do
      assert_no_difference "ReportExpense.count" do
        post_extraccion
      end
    end
  end

  # ---- multimoneda ----------------------------------------------------------

  test "exito USD: foreign como texto, tasa del servicio y COP multiplicando" do
    sign_in_as(@admin)
    payload = payload_modelo("currency" => "USD", "value" => 120.0, "tax" => 22.8, "total" => 142.8)

    with_fake_extractor(payload) do
      con_tasa(tasa_ok) do
        post_extraccion

        fields = json_body["fields"]

        assert_equal "USD", fields["currency"]
        assert_equal "120.00", fields["foreign_value"]
        assert_equal "22.80", fields["foreign_tax"]
        assert_equal "142.80", fields["foreign_total"]
        assert_equal "4120.500000", fields["exchange_rate"]
        assert_equal "2026-07-14", fields["exchange_rate_date"]
        assert_equal "trm_oficial", fields["exchange_rate_source"]
        assert_in_delta 494_460.0, fields["invoice_value"]
        assert_in_delta 93_947.4, fields["invoice_tax"]
        assert_in_delta 588_407.4, fields["invoice_total"]
        assert_equal [], json_body["warnings"]
      end
    end
  end

  test "USD sin tasa disponible: warning y los COP en nil" do
    sign_in_as(@admin)
    payload   = payload_modelo("currency" => "USD", "value" => 120.0, "tax" => 22.8, "total" => 142.8)
    sin_tasa  = ExchangeRateService::Result.new(ok: false, value: nil, errors: ["fuente caida"])

    with_fake_extractor(payload) do
      con_tasa(sin_tasa) do
        post_extraccion

        body   = json_body
        fields = body["fields"]

        assert_equal "120.00", fields["foreign_value"], "el valor extranjero se conserva"
        assert_nil fields["exchange_rate"]
        assert_nil fields["invoice_value"]
        assert_nil fields["invoice_total"]
        assert body["warnings"].any? { |w| w.include?("No se pudo obtener la tasa de USD") },
               "warnings: #{body["warnings"].inspect}"
      end
    end
  end

  test "tasa de otro dia habil: se aplica y se avisa" do
    sign_in_as(@admin)
    payload = payload_modelo("currency" => "USD", "value" => 120.0, "tax" => 22.8, "total" => 142.8)

    with_fake_extractor(payload) do
      con_tasa(tasa_ok(rate_date: Date.new(2026, 7, 12))) do
        post_extraccion

        body = json_body

        assert_equal "2026-07-12", body["fields"]["exchange_rate_date"]
        assert body["warnings"].any? { |w| w.include?("último día hábil disponible") },
               "warnings: #{body["warnings"].inspect}"
      end
    end
  end

  # ---- warnings y reglas ----------------------------------------------------

  test "la confianza baja genera un warning con etiqueta humana" do
    sign_in_as(@admin)

    with_fake_extractor(payload_modelo("confidence" => { "invoice_number" => 0.45 })) do
      post_extraccion

      warnings = json_body["warnings"]
      assert warnings.any? { |w| w.include?("número de factura") }, "warnings: #{warnings.inspect}"
    end
  end

  # LA EXTRACCION YA NO EVALUA REGLAS (decision de producto, 2026-08-29). Esta
  # prueba afirmaba que un duplicado se informaba aqui; ahora afirma lo
  # contrario, que es el punto: era el momento equivocado.
  #
  #   1. Un gasto escrito A MANO no pasa por este endpoint, asi que las reglas
  #      solo se veian si ademas se usaba la lectura del comprobante.
  #   2. Aqui todavia no hay responsable elegido, asi que se evaluaban las reglas
  #      de quien captura y no las de la persona por la que responde el gasto.
  #
  # La cobertura no se pierde: el duplicado se prueba al GUARDAR, en
  # report_expenses_budget_wiring_test.rb ("regla de DUPLICADOS...").
  test "la extraccion no evalua reglas ni aunque el gasto sea un duplicado" do
    sign_in_as(@admin)

    as_user(@admin) do
      ExpenseRule.create!(name: "Duplicados extract test", active: true, is_default: false,
                          check_duplicates: true, rols: [@admin.rol], user: @admin)
      ReportExpense.create!(
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        omitir_comprobante_obligatorio: true,
        user: @admin, cost_center: cost_centers(:centro_con_viaticos),
        user_invoice: users(:ingeniero), invoice_name: "Distribuidora El Sol SAS",
        invoice_date: Date.new(2026, 7, 14), description: "Original",
        invoice_number: "FE-4821", identification: "9001234567",
        invoice_value: 420_168.0, invoice_tax: 79_831.92, invoice_total: 500_000.0
      )
    end

    with_fake_extractor(payload_modelo) do
      post_extraccion

      refute json_body.key?("rule_violations"),
             "la extraccion no debe devolver reglas: body #{response.body[0, 300]}"
    end
  end

  # ---- fallos del servicio --------------------------------------------------

  test "un comprobante ilegible responde el error estandar con HTTP 200" do
    sign_in_as(@admin)

    with_fake_extractor(payload_modelo("unreadable" => true)) do
      post_extraccion

      assert_json_error(incluye: "Complete los datos manualmente")
    end
  end

  test "con el kill switch apagado responde el error de deshabilitado" do
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "false"
    sign_in_as(@admin)

    with_fake_extractor(payload_modelo) do |fake|
      post_extraccion

      assert_json_error(incluye: "deshabilitada")
      assert_empty fake.calls
    end
  end

  # ---- CSRF -----------------------------------------------------------------

  # La accion NO esta en el skip_before_action (que solo cubre :upload_file).
  # Con la proteccion encendida, un POST sin token no puede responder el JSON de
  # exito: o revienta con InvalidAuthenticityToken o la sesion se anula y Devise
  # corta. Si alguien agrega :extract_receipt al skip, este test se cae.
  test "csrf sigue activo para extract_receipt" do
    sign_in_as(@admin)
    previo = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true

    begin
      with_fake_extractor(payload_modelo) do
        post_extraccion
        refute_equal "success", (json_body["type"] rescue nil),
                     "sin token CSRF la accion no puede responder success"
      end
    rescue ActionController::InvalidAuthenticityToken
      # Tambien es un resultado valido: la proteccion esta activa.
    ensure
      ActionController::Base.allow_forgery_protection = previo
    end
  end
end

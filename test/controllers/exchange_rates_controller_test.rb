require "test_helper"
# Object#stub viene de minitest/mock, que ya esta dentro de minitest (no es una
# gema nueva). rails/test_help no lo carga solo y test_helper.rb es del
# paquete 01.
require "minitest/mock"

class ExchangeRatesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
  end

  def ok_result(rate_date: Date.new(2026, 7, 17), requested_date: Date.new(2026, 7, 17), stale: false)
    valor = ExchangeRateService::Rate.new(
      currency: "USD", requested_date: requested_date, rate_date: rate_date,
      rate_to_cop: BigDecimal("4120.5"), source: "trm_oficial", cached: true, stale: stale
    )
    ExchangeRateService::Result.new(ok: true, value: valor, errors: [])
  end

  def error_result(mensaje)
    ExchangeRateService::Result.new(ok: false, value: nil, errors: [mensaje])
  end

  test "sin autenticar redirige al login" do
    get get_exchange_rate_path, params: { currency: "USD", date: "2026-07-17" }

    assert_redirected_to new_user_session_path
  end

  test "COP responde 1.0 sin consultar" do
    sign_in_as(@admin)
    get get_exchange_rate_path, params: { currency: "COP", date: "2026-07-17" }

    cuerpo = JSON.parse(response.body)

    assert_response :success
    assert_equal "success", cuerpo["type"]
    assert_equal "1.0", cuerpo["rate_to_cop"]
    assert_equal "identity", cuerpo["source"]
  end

  test "devuelve la forma exacta del contrato E.1" do
    sign_in_as(@admin)

    ExchangeRateService.stub(:fetch, ->(**) { ok_result }) do
      get get_exchange_rate_path, params: { currency: "USD", date: "2026-07-17" }
    end

    cuerpo = JSON.parse(response.body)

    assert_response :success
    assert_equal %w[type currency rate_date requested_date rate_to_cop source cached stale].sort,
                 cuerpo.keys.sort
    assert_equal "USD", cuerpo["currency"]
    assert_equal "4120.5", cuerpo["rate_to_cop"]
    assert_equal true, cuerpo["cached"]
  end

  test "rate_date puede diferir de requested_date" do
    sign_in_as(@admin)
    stale = ok_result(rate_date: Date.new(2026, 7, 17),
                      requested_date: Date.new(2026, 7, 18), stale: true)

    ExchangeRateService.stub(:fetch, ->(**) { stale }) do
      get get_exchange_rate_path, params: { currency: "USD", date: "2026-07-18" }
    end

    cuerpo = JSON.parse(response.body)

    assert_equal "2026-07-17", cuerpo["rate_date"]
    assert_equal "2026-07-18", cuerpo["requested_date"]
    assert_not_equal cuerpo["rate_date"], cuerpo["requested_date"]
    assert_equal true, cuerpo["stale"]
  end

  test "error de fuente responde 200 con type error" do
    sign_in_as(@admin)
    mensaje = "No se pudo obtener la tasa para USD del 2026-07-14. Ingrésela manualmente"

    ExchangeRateService.stub(:fetch, ->(**) { error_result(mensaje) }) do
      get get_exchange_rate_path, params: { currency: "USD", date: "2026-07-14" }
    end

    cuerpo = JSON.parse(response.body)

    assert_response :success
    assert_equal "error", cuerpo["type"]
    assert_kind_of Array, cuerpo["message"]
    assert_equal [mensaje], cuerpo["message"]
  end

  test "moneda faltante responde type error" do
    sign_in_as(@admin)
    get get_exchange_rate_path, params: { date: "2026-07-17" }

    assert_response :success
    assert_equal "error", JSON.parse(response.body)["type"]
  end

  test "moneda no soportada responde type error" do
    sign_in_as(@admin)
    get get_exchange_rate_path, params: { currency: "ARS", date: "2026-07-17" }

    assert_response :success
    assert_equal "error", JSON.parse(response.body)["type"]
  end

  # El catalogo de monedas llega al navegador como global de layout (Tarea 12).
  # Se prueba aqui y no en el test del helper porque hace falta renderizar de
  # verdad layouts/user.html.erb, que es el layout de TODAS las pantallas: si
  # la linea nueva rompiera el ERB, se cae la aplicacion entera.
  test "el layout de usuario publica window.CM_CURRENCIES" do
    sign_in_as(@admin)
    get report_expenses_path

    assert_response :success
    assert_match(/window\.CM_CURRENCIES = \[/, response.body)
    assert_match(/"value":"USD"/, response.body)
  end

  test "nunca devuelve una tasa inventada cuando falla" do
    sign_in_as(@admin)

    ExchangeRateService.stub(:fetch, ->(**) { error_result("sin tasa") }) do
      get get_exchange_rate_path, params: { currency: "USD", date: "2026-07-14" }
    end

    cuerpo = JSON.parse(response.body)

    assert_not cuerpo.key?("rate_to_cop"), "una tasa inventada es un error contable silencioso"
    assert_not cuerpo.key?("rate_date")
  end
end

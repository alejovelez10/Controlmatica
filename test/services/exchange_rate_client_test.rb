require "test_helper"

# SOLO PARSERS. Ni un test de este archivo abre un socket: los metodos de red
# de ExchangeRateClient se ejercitan a traves del seam
# ExchangeRateService.fetch_remote, que los tests del servicio stubean.
# Si algun dia un test de aqui necesita internet, esta mal escrito.
class ExchangeRateClientTest < ActiveSupport::TestCase
  UPTO = Date.new(2026, 7, 18)

  def trm_body(desde: "2026-07-17T00:00:00.000", hasta: "2026-07-19T00:00:00.000", valor: "4120.50")
    [{ "valor" => valor, "unidad" => "COP", "vigenciadesde" => desde, "vigenciahasta" => hasta }].to_json
  end

  # --- parse_trm ------------------------------------------------------------

  test "parse_trm lee valor y vigencias" do
    quote = ExchangeRateClient.parse_trm(trm_body, upto: UPTO)

    assert_not_nil quote
    assert_equal BigDecimal("4120.5"), quote.rate
    assert_kind_of BigDecimal, quote.rate, "en Float, 120 * 4120.5 da 494459.99999999994"
    assert_equal Date.new(2026, 7, 17), quote.effective_date
    assert_equal Date.new(2026, 7, 19), quote.valid_until
  end

  test "parse_trm devuelve nil con arreglo vacio" do
    assert_nil ExchangeRateClient.parse_trm("[]", upto: UPTO)
  end

  test "parse_trm devuelve nil con JSON invalido" do
    assert_nil ExchangeRateClient.parse_trm("<html>503 Service Unavailable</html>", upto: UPTO)
  end

  test "parse_trm devuelve nil si la vigencia es futura" do
    cuerpo = trm_body(desde: "2026-07-20T00:00:00.000", hasta: "2026-07-22T00:00:00.000")

    assert_nil ExchangeRateClient.parse_trm(cuerpo, upto: UPTO)
  end

  test "parse_trm devuelve nil si excede LOOKBACK_DAYS" do
    cuerpo = trm_body(desde: "2026-06-08T00:00:00.000", hasta: "2026-06-09T00:00:00.000")

    assert_nil ExchangeRateClient.parse_trm(cuerpo, upto: UPTO)
  end

  test "parse_trm devuelve nil con valor cero o no numerico" do
    assert_nil ExchangeRateClient.parse_trm(trm_body(valor: "0"), upto: UPTO)
    assert_nil ExchangeRateClient.parse_trm(trm_body(valor: ""), upto: UPTO)
  end

  # --- parse_ecb_csv --------------------------------------------------------

  test "parse_ecb_csv toma la ultima observacion no vacia" do
    cuerpo = <<~CSV
      KEY,FREQ,CURRENCY,TIME_PERIOD,OBS_VALUE
      EXR.D.USD.EUR.SP00.A,D,USD,2026-07-15,1.0950
      EXR.D.USD.EUR.SP00.A,D,USD,2026-07-16,
      EXR.D.USD.EUR.SP00.A,D,USD,2026-07-17,1.1000
    CSV

    quote = ExchangeRateClient.parse_ecb_csv(cuerpo, upto: UPTO)

    assert_not_nil quote
    assert_equal BigDecimal("1.1"), quote.rate
    assert_equal Date.new(2026, 7, 17), quote.effective_date
  end

  test "parse_ecb_csv ubica columnas por nombre y no por posicion" do
    cuerpo = <<~CSV
      OBS_VALUE,TIME_PERIOD,KEY,FREQ,CURRENCY
      1.0950,2026-07-15,EXR.D.USD.EUR.SP00.A,D,USD
      ,2026-07-16,EXR.D.USD.EUR.SP00.A,D,USD
      1.1000,2026-07-17,EXR.D.USD.EUR.SP00.A,D,USD
    CSV

    quote = ExchangeRateClient.parse_ecb_csv(cuerpo, upto: UPTO)

    assert_not_nil quote
    assert_equal BigDecimal("1.1"), quote.rate
    assert_equal Date.new(2026, 7, 17), quote.effective_date
  end

  test "parse_ecb_csv ignora observaciones posteriores a upto" do
    cuerpo = <<~CSV
      KEY,TIME_PERIOD,OBS_VALUE
      EXR.D.USD.EUR.SP00.A,2026-07-17,1.1000
      EXR.D.USD.EUR.SP00.A,2026-07-19,1.2000
    CSV

    quote = ExchangeRateClient.parse_ecb_csv(cuerpo, upto: UPTO)

    assert_not_nil quote
    assert_equal BigDecimal("1.1"), quote.rate
    assert_equal Date.new(2026, 7, 17), quote.effective_date
  end

  test "parse_ecb_csv devuelve nil con cuerpo vacio o basura" do
    assert_nil ExchangeRateClient.parse_ecb_csv("", upto: UPTO)
    assert_nil ExchangeRateClient.parse_ecb_csv("no soy csv\x00", upto: UPTO)
  end

  test "parse_ecb_csv devuelve nil si la observacion excede LOOKBACK_DAYS" do
    cuerpo = <<~CSV
      KEY,TIME_PERIOD,OBS_VALUE
      EXR.D.USD.EUR.SP00.A,2026-06-01,1.1000
    CSV

    assert_nil ExchangeRateClient.parse_ecb_csv(cuerpo, upto: UPTO)
  end

  # --- EUR: atajo sin red ---------------------------------------------------

  test "ecb_units_per_eur devuelve 1 para EUR sin pegarle a la red" do
    # La serie D.EUR.EUR.SP00.A no existe; pedirla devolveria 404 y el cruce
    # de EUR quedaria roto para siempre.
    quote = ExchangeRateClient.new.ecb_units_per_eur(currency: "eur", date: UPTO)

    assert_equal BigDecimal("1"), quote.rate
    assert_equal UPTO, quote.effective_date
  end

  # --- configuracion --------------------------------------------------------

  # Los timeouts se leen de ENV en cada llamada (no en una constante) para que
  # se puedan bajar en produccion sin desplegar. Se prueban las dos ramas con
  # ENV controlado: leer el ENV real haria depender la suite de la copia local
  # de config/application.yml, que esta gitignoreada.
  test "los timeouts y las URLs caen a un default corto sin ENV" do
    con_env("EXCHANGE_RATE_OPEN_TIMEOUT" => nil, "EXCHANGE_RATE_HTTP_TIMEOUT" => nil,
            "TRM_API_URL" => nil, "ECB_API_URL" => nil) do
      cliente = ExchangeRateClient.new

      assert_equal 3, cliente.open_timeout
      assert_equal 5, cliente.read_timeout
      assert_equal ExchangeRateClient::TRM_URL_DEFAULT, cliente.trm_url
      assert_equal ExchangeRateClient::ECB_URL_DEFAULT, cliente.ecb_url
    end
  end

  test "los timeouts y las URLs se pueden mover por ENV" do
    con_env("EXCHANGE_RATE_OPEN_TIMEOUT" => "1", "EXCHANGE_RATE_HTTP_TIMEOUT" => "2",
            "TRM_API_URL" => "https://otro.example/trm.json",
            "ECB_API_URL" => "https://otro.example/EXR") do
      cliente = ExchangeRateClient.new

      assert_equal 1, cliente.open_timeout
      assert_equal 2, cliente.read_timeout
      assert_equal "https://otro.example/trm.json", cliente.trm_url
      assert_equal "https://otro.example/EXR", cliente.ecb_url
    end
  end

  private

  def con_env(pares)
    previos = pares.keys.index_with { |clave| ENV[clave] }
    pares.each { |clave, valor| valor.nil? ? ENV.delete(clave) : ENV[clave] = valor }
    yield
  ensure
    previos.each { |clave, valor| valor.nil? ? ENV.delete(clave) : ENV[clave] = valor }
  end
end

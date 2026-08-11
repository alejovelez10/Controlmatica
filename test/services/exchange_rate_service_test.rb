require "test_helper"
# minitest/mock trae Object#stub y NO es una gema nueva: viene dentro de
# minitest, que ya esta en el Gemfile. rails/test_help no lo carga solo, y
# test_helper.rb es del paquete 01, asi que el require va aqui.
require "minitest/mock"

# NINGUN test de este archivo toca la red. El unico seam es el metodo publico
# ExchangeRateService.fetch_remote (00-ARQUITECTURA 6.7), que cada test
# reemplaza con `stub`. Para afirmar "no se consulto la fuente" se stubea con
# un lambda que hace flunk.
class ExchangeRateServiceTest < ActiveSupport::TestCase
  # Doble del cliente HTTP para el UNICO test que necesita bajar un nivel: el
  # del cruce EUR, donde lo que se prueba es la direccion de la division. No
  # vive en test/support/ porque no lo comparte nadie mas.
  class ClienteFalso
    attr_reader :consultas

    def initialize(trm:, usd_per_eur:)
      @trm = trm
      @usd_per_eur = usd_per_eur
      @consultas = []
    end

    def trm_cop_per_usd(date:)
      @consultas << [:trm, date]
      @trm
    end

    def ecb_units_per_eur(currency:, date:)
      code = Currency.normalize(currency)
      @consultas << [:ecb, code, date]
      # Espeja el atajo del cliente real: 1 EUR vale 1 EUR y la serie D.EUR.EUR
      # no existe.
      return quote(BigDecimal("1"), date) if code == "EUR"

      quote(@usd_per_eur, date) if code == "USD"
    end

    private

    def quote(rate, date)
      ExchangeRateClient::Quote.new(rate: rate, effective_date: date, valid_until: date)
    end
  end

  # --- helpers de stub ------------------------------------------------------

  def remoto_ok(rate:, effective_date:, valid_until:, source: "trm_oficial")
    quote = ExchangeRateClient::Quote.new(rate: rate, effective_date: effective_date,
                                          valid_until: valid_until)
    ExchangeRateService::Result.new(ok: true, errors: [],
                                    value: { quote: quote, source: source })
  end

  def remoto_caido(mensaje = "fuente TRM no disponible")
    ExchangeRateService::Result.new(ok: false, value: nil, errors: [mensaje])
  end

  def sin_fuente(&bloque)
    ExchangeRateService.stub(:fetch_remote, ->(**) { flunk "no debio consultar la fuente" }, &bloque)
  end

  # --- contrato del Result --------------------------------------------------

  test "el Result canonico tiene ok value y errors" do
    assert_equal %i[ok value errors], ExchangeRateService::Result.members

    bueno = ExchangeRateService::Result.new(ok: true, value: 1, errors: [])
    malo  = ExchangeRateService::Result.new(ok: false, value: nil, errors: ["x"])

    assert bueno.ok?
    assert_not bueno.error?
    assert malo.error?
    assert ExchangeRateService.respond_to?(:fetch_remote), "fetch_remote es el seam del paquete 12"
  end

  # --- cortes tempranos -----------------------------------------------------

  test "COP devuelve 1.0 sin tocar base ni red" do
    resultado = nil

    assert_no_difference("ExchangeRate.count") do
      sin_fuente { resultado = ExchangeRateService.fetch(currency: "COP", date: Date.new(2026, 7, 17)) }
    end

    assert resultado.ok?
    assert_equal BigDecimal("1"), resultado.value.rate_to_cop
    assert_equal "identity", resultado.value.source
    assert_equal true, resultado.value.cached
    assert_equal false, resultado.value.stale
  end

  test "moneda invalida devuelve Result de error" do
    resultado = nil
    sin_fuente { resultado = ExchangeRateService.fetch(currency: "ARS", date: Date.new(2026, 7, 17)) }

    assert resultado.error?
    assert_kind_of Array, resultado.errors
    assert_includes resultado.errors.first, "ARS"
    assert_nil resultado.value
  end

  test "fecha invalida devuelve Result de error" do
    resultado = nil
    sin_fuente { resultado = ExchangeRateService.fetch(currency: "USD", date: "no-es-fecha") }

    assert resultado.error?
    assert_equal ["Fecha inválida"], resultado.errors
  end

  test "fecha futura devuelve Result de error" do
    resultado = nil
    sin_fuente { resultado = ExchangeRateService.fetch(currency: "USD", date: Date.current + 5) }

    assert resultado.error?
    assert_includes resultado.errors.first, "futura"
  end

  # --- cache ----------------------------------------------------------------

  test "hit de cache no consulta la fuente" do
    resultado = nil

    assert_no_difference("ExchangeRate.count") do
      sin_fuente { resultado = ExchangeRateService.fetch(currency: "USD", date: Date.new(2026, 7, 17)) }
    end

    assert resultado.ok?
    assert_equal true, resultado.value.cached
    assert_equal BigDecimal("4120.5"), resultado.value.rate_to_cop
    assert_equal Date.new(2026, 7, 17), resultado.value.rate_date
  end

  test "miss persiste la tasa y la devuelve" do
    dia = Date.new(2026, 8, 3)
    ok  = remoto_ok(rate: BigDecimal("4200.75"), effective_date: dia, valid_until: dia)
    resultado = nil

    assert_difference("ExchangeRate.count", 1) do
      ExchangeRateService.stub(:fetch_remote, ->(**) { ok }) do
        resultado = ExchangeRateService.fetch(currency: "USD", date: dia)
      end
    end

    assert resultado.ok?
    assert_equal false, resultado.value.cached

    fila = ExchangeRate.applicable_on("USD", dia).first
    assert_equal "trm_oficial", fila.source
    assert_equal BigDecimal("4200.75"), fila.rate_to_cop
    assert_not_nil fila.fetched_at
  end

  test "fin de semana usa el habil anterior y lo reporta" do
    viernes = Date.new(2026, 8, 7)
    sabado  = Date.new(2026, 8, 8)
    domingo = Date.new(2026, 8, 9)
    ok = remoto_ok(rate: BigDecimal("4120.5"), effective_date: viernes, valid_until: domingo)
    resultado = nil

    ExchangeRateService.stub(:fetch_remote, ->(**) { ok }) do
      resultado = ExchangeRateService.fetch(currency: "USD", date: sabado)
    end

    assert resultado.ok?
    assert_equal viernes, resultado.value.rate_date
    assert_equal sabado,  resultado.value.requested_date
    assert_equal true,    resultado.value.stale
  end

  test "el rango de vigencia se persiste dia por dia" do
    viernes = Date.new(2026, 8, 7)
    sabado  = Date.new(2026, 8, 8)
    domingo = Date.new(2026, 8, 9)
    ok = remoto_ok(rate: BigDecimal("4120.5"), effective_date: viernes, valid_until: domingo)

    assert_difference("ExchangeRate.count", 3) do
      ExchangeRateService.stub(:fetch_remote, ->(**) { ok }) do
        ExchangeRateService.fetch(currency: "USD", date: sabado)
      end
    end

    filas = ExchangeRate.where(currency: "USD", rate_date: viernes..domingo).order(:rate_date)

    assert_equal [viernes, sabado, domingo], filas.map(&:rate_date)
    assert_equal [viernes] * 3, filas.map(&:effective_date)
    assert_equal [BigDecimal("4120.5")] * 3, filas.map(&:rate_to_cop)
  end

  # ESTE es el test que justifica tener effective_date ademas de rate_date: sin
  # la fila del domingo, cada consulta de un fin de semana volveria a la red.
  test "segunda consulta del domingo sale de cache" do
    viernes = Date.new(2026, 8, 7)
    domingo = Date.new(2026, 8, 9)
    ok = remoto_ok(rate: BigDecimal("4120.5"), effective_date: viernes, valid_until: domingo)

    ExchangeRateService.stub(:fetch_remote, ->(**) { ok }) do
      ExchangeRateService.fetch(currency: "USD", date: domingo)
    end

    segunda = nil
    assert_no_difference("ExchangeRate.count") do
      sin_fuente { segunda = ExchangeRateService.fetch(currency: "USD", date: domingo) }
    end

    assert segunda.ok?
    assert_equal true, segunda.value.cached
    assert_equal viernes, segunda.value.rate_date
  end

  # --- cruce EUR ------------------------------------------------------------

  test "EUR cruza BCE con TRM en la direccion correcta" do
    dia = Date.new(2026, 8, 3)
    trm = ExchangeRateClient::Quote.new(rate: BigDecimal("4000"), effective_date: dia, valid_until: dia)
    cliente = ClienteFalso.new(trm: trm, usd_per_eur: BigDecimal("1.10"))
    resultado = nil

    ExchangeRateClient.stub(:new, cliente) do
      resultado = ExchangeRateService.fetch(currency: "EUR", date: dia)
    end

    assert resultado.ok?
    # 1.10 USD por EUR * 4000 COP por USD = 4400 COP por EUR. Si la division se
    # invirtiera daria ~3636 y nadie lo notaria hasta el cierre contable.
    assert_equal BigDecimal("4400.0"), resultado.value.rate_to_cop
    assert_equal "bce", resultado.value.source
    assert_includes cliente.consultas, [:ecb, "USD", dia]
  end

  test "EUR con TRM caida devuelve error y no persiste" do
    resultado = nil

    assert_no_difference("ExchangeRate.count") do
      ExchangeRateService.stub(:fetch_remote, ->(**) { remoto_caido }) do
        resultado = ExchangeRateService.fetch(currency: "EUR", date: Date.new(2026, 8, 3))
      end
    end

    assert resultado.error?
  end

  # --- caida de la fuente ---------------------------------------------------

  test "timeout de la fuente devuelve Result no excepcion" do
    dia = Date.new(2026, 8, 3)
    resultado = nil

    ExchangeRateService.stub(:fetch_remote, ->(**) { remoto_caido }) do
      resultado = ExchangeRateService.fetch(currency: "USD", date: dia)
    end

    assert resultado.error?
    assert_equal ["No se pudo obtener la tasa para USD del 2026-08-03. Ingrésela manualmente"],
                 resultado.errors
  end

  test "fuente caida cae a la tasa cacheada mas reciente dentro de la ventana" do
    resultado = nil

    ExchangeRateService.stub(:fetch_remote, ->(**) { remoto_caido }) do
      resultado = ExchangeRateService.fetch(currency: "USD", date: Date.new(2026, 7, 5))
    end

    assert resultado.ok?
    assert_equal true, resultado.value.cached
    assert_equal true, resultado.value.stale
    assert_equal Date.new(2026, 7, 1), resultado.value.rate_date
    assert_equal BigDecimal("4050.0"), resultado.value.rate_to_cop
  end

  test "fuente caida sin nada dentro de la ventana falla" do
    # 2026-08-05 esta a mas de MAX_STALE_DAYS de usd_vieja (2026-07-01) y de
    # usd_fin_de_semana (2026-07-18).
    resultado = nil

    ExchangeRateService.stub(:fetch_remote, ->(**) { remoto_caido }) do
      resultado = ExchangeRateService.fetch(currency: "USD", date: Date.new(2026, 8, 5))
    end

    assert resultado.error?
    assert_nil resultado.value
  end

  # --- concurrencia ---------------------------------------------------------

  test "upsert_row! sobrevive un duplicado y deja la transaccion usable" do
    atributos = { currency: "USD", rate_date: Date.new(2026, 7, 17),
                  effective_date: Date.new(2026, 7, 17), rate_to_cop: BigDecimal("9999"),
                  source: "manual", fetched_at: Time.current }

    fila = ExchangeRateService.upsert_row!(atributos)

    assert_equal exchange_rates(:usd_habil), fila
    # Sin `requires_new: true` en el savepoint, esta consulta reventaria con
    # PG::InFailedSqlTransaction en vez de responder.
    assert_equal 4, ExchangeRate.count
  end

  test "dos hilos que resuelven la misma moneda y fecha dejan una sola fila" do
    dia = Date.new(2026, 8, 4)
    ok  = remoto_ok(rate: BigDecimal("4111.11"), effective_date: dia, valid_until: dia)

    # Los hilos corren FUERA de la transaccion del test (cada uno toma su propia
    # conexion), asi que sus INSERT se commitean de verdad y hay que limpiarlos
    # a mano al final o contaminan el resto de la corrida.
    resultados = []
    ExchangeRateService.stub(:fetch_remote, ->(**) { ok }) do
      hilos = 2.times.map do
        Thread.new do
          ActiveRecord::Base.connection_pool.with_connection do
            ExchangeRateService.fetch(currency: "USD", date: dia)
          end
        end
      end
      # join relanza cualquier excepcion del hilo: si el savepoint faltara,
      # PG::InFailedSqlTransaction haria fallar este test aqui.
      resultados = hilos.map(&:value)
    end

    assert resultados.all?(&:ok?), "ninguno de los dos hilos debe fallar"
    assert_equal 1, contar_fuera_de_la_transaccion(dia)
  ensure
    limpiar_fuera_de_la_transaccion(dia)
  end

  # --- captura manual -------------------------------------------------------

  test "record_manual pisa la tasa automatica de esa fecha" do
    resultado = nil

    assert_no_difference("ExchangeRate.count") do
      resultado = ExchangeRateService.record_manual(currency: "USD",
                                                    date: Date.new(2026, 7, 17),
                                                    rate: BigDecimal("4200"))
    end

    assert resultado.ok?
    fila = exchange_rates(:usd_habil).reload

    assert_equal BigDecimal("4200"), fila.rate_to_cop
    assert_equal "manual", fila.source
  end

  test "record_manual crea la fila cuando no existe y rechaza basura" do
    dia = Date.new(2026, 8, 6)

    assert_difference("ExchangeRate.count", 1) do
      assert ExchangeRateService.record_manual(currency: " usd ", date: dia, rate: "4300.25").ok?
    end

    fila = ExchangeRate.applicable_on("USD", dia).first
    assert_equal BigDecimal("4300.25"), fila.rate_to_cop
    assert_equal dia, fila.effective_date

    assert ExchangeRateService.record_manual(currency: "USD", date: dia, rate: 0).error?
    assert ExchangeRateService.record_manual(currency: "ARS", date: dia, rate: 1).error?
    assert ExchangeRateService.record_manual(currency: "COP", date: dia, rate: 1).error?
  end

  private

  # Los hilos escriben en su propia conexion; para verlos (y borrarlos) hay que
  # salir de la transaccion del test, que es lo que da un hilo nuevo.
  def contar_fuera_de_la_transaccion(dia)
    Thread.new do
      ActiveRecord::Base.connection_pool.with_connection do |conn|
        conn.select_value(
          ActiveRecord::Base.sanitize_sql_array(
            ["SELECT count(*) FROM exchange_rates WHERE currency = 'USD' AND rate_date = ?", dia]
          )
        ).to_i
      end
    end.value
  end

  def limpiar_fuera_de_la_transaccion(dia)
    Thread.new do
      ActiveRecord::Base.connection_pool.with_connection do |conn|
        conn.execute(
          ActiveRecord::Base.sanitize_sql_array(
            ["DELETE FROM exchange_rates WHERE currency = 'USD' AND rate_date = ?", dia]
          )
        )
      end
    end.join
  end
end

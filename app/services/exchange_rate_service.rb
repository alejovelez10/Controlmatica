# Orquestador de tasas de cambio: cache -> fuente -> persistencia -> fallback.
#
# REGLAS TRANSVERSALES (00-ARQUITECTURA 4.2), todas verificables por grep:
#   - No conoce el actor global de auditoria ni la sesion (criterio 11 del
#     paquete: el grep sobre app/services/exchange_rate_*.rb no devuelve nada).
#     Corre desde un request, desde la tool MCP y desde un rake, y en dos de los
#     tres no hay sesion de la que leer un usuario.
#   - Nunca se llama dentro de la transaccion con CostCenter.lock de la
#     evaluacion presupuestal: el pool de AR es 5 y Puma tiene 5 hilos, asi que
#     un timeout de 5s de datos.gov.co bloquearia el pool entero. La tasa se
#     resuelve ANTES de abrir la transaccion y llega al modelo como numero.
#   - Cero reintentos y cero excepciones hacia afuera: siempre devuelve Result.
class ExchangeRateService
  # CONTRATO CANONICO (00-ARQUITECTURA 4.2 / 6.7). El miembro de error se llama
  # `errors` y es un ARRAY: lo consumen las tools MCP del paquete 11 y los
  # controllers del 07. `result.error` en singular no existe.
  Result = Struct.new(:ok, :value, :errors, keyword_init: true) do
    def ok?    = ok
    def error? = !ok
  end

  # requested_date = lo que se pidio; rate_date = el dia habil que publico la
  # tasa (exchange_rates.effective_date). Distinguirlos es lo que permite al
  # frontend avisar "no hay tasa del sabado, se aplico la del viernes".
  Rate = Struct.new(:currency, :requested_date, :rate_date, :rate_to_cop,
                    :source, :cached, :stale, keyword_init: true)

  # 10 dias cubre el puente festivo colombiano mas largo (4 dias) con margen.
  # Mas alla de eso ya no es "la tasa del dia" y afirmarlo seria mentir en un
  # documento contable: mejor pedir captura manual.
  MAX_STALE_DAYS = 10

  # TRAMPA VERIFICADA: no hay config.time_zone en config/application.rb, asi
  # que Rails corre en UTC. En Bogota (UTC-5), a las 19:05 hora local
  # Date.today en el servidor YA ES MAÑANA y pedir la TRM de "hoy" caeria en la
  # validacion de fecha futura. No sustituir por Date.current.
  BOGOTA = "America/Bogota".freeze

  def self.call(currency:, date:) = fetch(currency: currency, date: date)

  def self.today = Time.find_zone(BOGOTA).today

  # Devuelve Result con un Rate. El orden de los pasos importa: los tres
  # primeros cortan ANTES de tocar la base o la red.
  def self.fetch(currency:, date:)
    code = Currency.normalize(currency)
    return error("Moneda no soportada: #{currency}") unless Currency.valid?(code)

    d = a_fecha(date)
    return error("Fecha inválida") if d.nil?

    # COP no se consulta a nadie: 1 peso vale 1 peso. Sin base y sin red.
    if code == Currency::DEFAULT
      return ok(Rate.new(currency: Currency::DEFAULT, requested_date: d, rate_date: d,
                         rate_to_cop: BigDecimal("1"), source: "identity",
                         cached: true, stale: false))
    end

    return error("No existe tasa para una fecha futura") if d > today

    # 1) Cache exacta. Un hit no genera NI UN byte de HTTP.
    fila = ExchangeRate.applicable_on(code, d).first
    return ok(desde_fila(fila, d, cached: true)) if fila.present?

    # 2) Fuente. fetch_remote ya rescato todo: devuelve Result, no levanta.
    remoto = fetch_remote(currency: code, date: d)

    if remoto.ok?
      quote  = remoto.value[:quote]
      source = remoto.value[:source]
      persist_range!(code, quote, source, d)

      return ok(Rate.new(currency: code, requested_date: d, rate_date: quote.effective_date,
                         rate_to_cop: quote.rate, source: source,
                         cached: false, stale: quote.effective_date != d))
    end

    # 3) Fallback por caida de la fuente: la ultima tasa conocida dentro de la
    # ventana, SIEMPRE marcada como stale. Nunca se devuelve un valor inventado
    # ni la tasa de otra fecha sin decirlo.
    vieja = ExchangeRate.latest_before(code, d, MAX_STALE_DAYS).first
    return ok(desde_fila(vieja, d, cached: true, stale: true)) if vieja.present?

    error("No se pudo obtener la tasa para #{code} del #{d}. Ingrésela manualmente")
  end

  # UNICO seam de red del paquete (00-ARQUITECTURA 6.7). Publico a proposito:
  # el paquete 12 le hace `prepend` en config/initializers/e2e_stubs.rb y los
  # tests lo reemplazan con `stub`. NO recibe el cliente por parametro: dos
  # mecanismos distintos para inyectar lo mismo hacen imposible escribir el
  # initializer del E2E.
  #
  # Devuelve Result cuyo value es { quote: ExchangeRateClient::Quote, source: }.
  def self.fetch_remote(currency:, date:)
    code  = Currency.normalize(currency)
    d     = date.to_date
    ruteo = Currency.rate_source(code)
    return error("Moneda no soportada: #{currency}") if ruteo.nil?

    # Un peso vale un peso: ni red, ni base. Va ANTES de pedir la TRM: este
    # metodo es publico y el initializer de E2E lo llama directo para COP, asi
    # que la moneda base abriendo un socket seria un bug latente.
    if ruteo == :identity
      return ok({ quote: ExchangeRateClient::Quote.new(rate: BigDecimal("1"), effective_date: d,
                                                       valid_until: d),
                 source: "identity" })
    end

    client = ExchangeRateClient.new

    # La TRM es el ancla de TODO: incluso el EUR y el resto se convierten
    # cruzando por USD, porque la tasa legal para causar en pesos en Colombia
    # es la TRM.
    trm = client.trm_cop_per_usd(date: d)
    return error("fuente TRM no disponible") if trm.nil?

    case ruteo
    when :trm
      rate        = trm.rate
      source      = "trm_oficial"
      effective   = trm.effective_date
      valid_until = trm.valid_until
    when :ecb
      x_per_eur   = client.ecb_units_per_eur(currency: code, date: d)  # unidades de X por 1 EUR
      usd_per_eur = client.ecb_units_per_eur(currency: "USD", date: d) # USD por 1 EUR
      return error("fuente BCE no disponible") if x_per_eur.nil? || usd_per_eur.nil? || x_per_eur.rate <= 0

      # COP_por_X = (USD_por_EUR / X_por_EUR) * TRM. Invertir esta division es
      # el error mas caro del paquete: con EUR daria ~0.0002 COP.
      usd_per_unit = usd_per_eur.rate / x_per_eur.rate
      rate         = (usd_per_unit * trm.rate).round(6)
      source       = "bce"
      # La vigencia es la de la fuente MAS VIEJA de las tres: afirmar la fecha
      # de la mas nueva seria decir que la tasa es mas fresca de lo que es.
      effective    = [trm.effective_date, x_per_eur.effective_date, usd_per_eur.effective_date].min
      valid_until  = d
    when :cross_usd
      x_per_usd = client.units_per_usd(currency: code, date: d)
      return error("fuente cross_usd no disponible") if x_per_usd.nil? || x_per_usd.rate <= 0

      # COP_por_X = TRM_COP_por_USD / X_por_USD. Invertir esta division es el
      # error mas caro del paquete: con DOP daria 0,0189 COP en vez de 52,90.
      rate        = (trm.rate / x_per_usd.rate).round(6)
      source      = "cross_usd"
      # La vigencia es la de la fuente MAS VIEJA de las dos.
      effective   = [trm.effective_date, x_per_usd.effective_date].min
      valid_until = d
    end

    return error("tasa no positiva") if rate <= 0

    ok({ quote: ExchangeRateClient::Quote.new(rate: rate, effective_date: effective,
                                              valid_until: valid_until),
         source: source })
  end

  # Captura manual de una tasa. La manual PISA a la automatica de esa fecha, no
  # al reves: si un humano corrigio la TRM es porque la fuente estaba mal.
  #
  # Se entrega implementada y probada pero NO cableada a ningun controller: en
  # este paquete el ajuste manual vive en report_expenses.exchange_rate.
  def self.record_manual(currency:, date:, rate:)
    code = Currency.normalize(currency)
    return error("Moneda no soportada: #{currency}") unless Currency.valid?(code)
    return error("La moneda base no tiene tasa manual") if code == Currency::DEFAULT

    d = a_fecha(date)
    return error("Fecha inválida") if d.nil?

    valor = a_decimal(rate)
    return error("Tasa inválida") if valor.nil? || valor <= 0

    atributos = { currency: code, rate_date: d, effective_date: d, rate_to_cop: valor,
                  source: "manual", fetched_at: Time.current }

    fila = upsert_row!(atributos)
    return error("No se pudo guardar la tasa manual de #{code} del #{d}") if fila.nil?

    fila.update!(atributos.except(:currency, :rate_date))

    ok(desde_fila(fila.reload, d, cached: false))
  end

  # EL CORAZON DE LA CACHE. Escribe una fila POR CADA DIA del rango de vigencia
  # (viernes, sabado y domingo con la tasa del viernes), que es lo que hace que
  # la segunda consulta de un domingo no vuelva a pegarle a la red.
  def self.persist_range!(code, quote, source, requested_date)
    desde = quote.effective_date
    hasta = [quote.valid_until, requested_date].compact.max
    # Recortes de seguridad: nunca mas de MAX_STALE_DAYS + 1 dias (una fuente
    # con una vigencia absurda no debe llenar la tabla) y nunca mas alla de hoy
    # (no se cachea el futuro).
    hasta = [hasta, desde + MAX_STALE_DAYS, today].min

    return [] if hasta < desde

    (desde..hasta).map do |dia|
      upsert_row!(currency: code, rate_date: dia, effective_date: desde,
                  rate_to_cop: quote.rate, source: source, fetched_at: Time.current)
    end
  end

  # `requires_new: true` es OBLIGATORIO, no decorativo: en PostgreSQL, rescatar
  # un RecordNotUnique dentro de una transaccion SIN savepoint deja la
  # transaccion abortada y todo lo que siga revienta con
  # PG::InFailedSqlTransaction. Con 5 hilos de Puma esa carrera es real.
  def self.upsert_row!(attrs)
    ActiveRecord::Base.transaction(requires_new: true) { ExchangeRate.create!(attrs) }
  rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid
    ExchangeRate.applicable_on(attrs[:currency], attrs[:rate_date]).first
  end

  # --- helpers privados de construccion -------------------------------------

  def self.ok(value)  = Result.new(ok: true,  value: value, errors: [])
  def self.error(msg) = Result.new(ok: false, value: nil,   errors: [msg])

  def self.desde_fila(fila, requested_date, cached:, stale: nil)
    Rate.new(currency: fila.currency, requested_date: requested_date,
             rate_date: fila.effective_date, rate_to_cop: fila.rate_to_cop,
             source: fila.source, cached: cached,
             stale: stale.nil? ? fila.stale_for?(requested_date) : stale)
  end

  def self.a_fecha(valor)
    return nil if valor.blank?

    valor.to_date
  rescue ArgumentError, TypeError, NoMethodError, Date::Error
    nil
  end

  def self.a_decimal(valor)
    return nil if valor.blank?

    BigDecimal(valor.to_s)
  rescue ArgumentError, TypeError
    nil
  end

  private_class_method :ok, :error, :desde_fila, :a_fecha, :a_decimal
end

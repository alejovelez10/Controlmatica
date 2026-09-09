require "httparty"
require "csv"

# UNICA clase del proyecto que abre sockets hacia las fuentes de tasas.
#
# NO SE INYECTA (00-ARQUITECTURA 6.7): se instancia solo dentro de
# ExchangeRateService.fetch_remote, que es el unico seam de red del paquete.
# Los tests stubean `ExchangeRateService.fetch_remote`, y el initializer de
# stubs del E2E le hace `prepend` a ese mismo nombre. Dos mecanismos distintos
# para lo mismo hacen imposible escribir el segundo.
#
# Contrato de los cuatro metodos publicos: NUNCA levantan. Si la fuente no
# responde, responde basura, responde 429 o responde 404, devuelven nil y el
# servicio decide que hacer (cache vieja o captura manual).
class ExchangeRateClient
  Quote = Struct.new(:rate, :effective_date, :valid_until, keyword_init: true)

  TRM_URL_DEFAULT = "https://www.datos.gov.co/resource/32sa-8pi3.json".freeze
  ECB_URL_DEFAULT = "https://data-api.ecb.europa.eu/service/data/EXR".freeze

  # @fawazahmed0/currency-api: 340 monedas, sin llave, publica TODOS los dias
  # (incluido sabado, domingo y 1 de enero — verificado), asi que para una fecha
  # pasada valida devuelve ESA fecha y no hace falta bucle de lookback.
  # El marcador se reemplaza con `sub` y no con `format`: un `%` suelto en un
  # override de ENV haria levantar a `format`, y esta clase no levanta nunca.
  CROSS_USD_URL_DEFAULT =
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@%{ver}/v1/currencies/usd.json".freeze
  CROSS_USD_FALLBACK_URL_DEFAULT =
    "https://%{ver}.currency-api.pages.dev/v1/currencies/usd.json".freeze

  # Ventana maxima hacia atras que se acepta de una fuente. Mas alla de eso la
  # tasa deja de ser "la del dia" y afirmarlo seria mentir en un documento
  # contable.
  LOOKBACK_DAYS = 10

  # Las excepciones se enumeran una por una a proposito: un `rescue => e`
  # generico se tragaria tambien los NoMethodError del propio codigo y
  # convertiria un bug en "la fuente no respondio". ArgumentError esta por
  # BigDecimal("") y Date.parse("").
  ERRORES_DE_RED = [
    HTTParty::Error, Net::OpenTimeout, Net::ReadTimeout, Timeout::Error,
    SocketError, Errno::ECONNREFUSED, Errno::ECONNRESET, OpenSSL::SSL::SSLError,
    JSON::ParserError, CSV::MalformedCSVError, ArgumentError
  ].freeze

  def open_timeout = (ENV["EXCHANGE_RATE_OPEN_TIMEOUT"].presence || 3).to_i
  def read_timeout = (ENV["EXCHANGE_RATE_HTTP_TIMEOUT"].presence || 5).to_i

  def trm_url = ENV["TRM_API_URL"].presence || TRM_URL_DEFAULT
  def ecb_url = ENV["ECB_API_URL"].presence || ECB_URL_DEFAULT

  def cross_usd_url          = ENV["CROSS_USD_API_URL"].presence || CROSS_USD_URL_DEFAULT
  def cross_usd_fallback_url = ENV["CROSS_USD_FALLBACK_URL"].presence || CROSS_USD_FALLBACK_URL_DEFAULT

  # Reemplaza el marcador de version en las DOS plantillas (CDN y respaldo) y
  # devuelve las URLs finales, en ese orden. Sin red: es lo que hace posible
  # probar la construccion de URL sin abrir un socket.
  def cross_usd_request_url(ver:)
    [cross_usd_url, cross_usd_fallback_url].map { |plantilla| plantilla.sub("%{ver}", ver) }
  end

  # COP por 1 USD, vigente en `date`. nil si la fuente no responde o no cubre
  # la fecha.
  #
  # El dataset Socrata publica vigenciadesde/vigenciahasta, asi que pedir "la
  # ultima fila cuya vigencia empieza antes del cierre del dia pedido" ya
  # resuelve el fin de semana y el festivo: devuelve la del ultimo habil.
  def trm_cop_per_usd(date:)
    query = {
      "$where" => "vigenciadesde <= '#{date.strftime('%Y-%m-%d')}T23:59:59.000'",
      "$order" => "vigenciadesde DESC",
      "$limit" => 1
    }
    # Sin token, datos.gov.co estrangula por IP y responde 429 bajo carga.
    query["$$app_token"] = ENV["DATOS_GOV_APP_TOKEN"] if ENV["DATOS_GOV_APP_TOKEN"].present?

    response = HTTParty.get(trm_url,
                            query: query,
                            headers: { "Accept" => "application/json" },
                            open_timeout: open_timeout,
                            timeout: read_timeout)

    # Antes de parsear: Socrata responde 429 al estrangular y el BCE 404 cuando
    # la ventana no tiene observaciones. Parsear un cuerpo de error da basura.
    return nil unless response.code.to_i == 200

    self.class.parse_trm(response.body, upto: date)
  rescue *ERRORES_DE_RED => e
    Rails.logger.warn("[ExchangeRateClient] #{e.class}: #{e.message}")
    nil
  end

  # Unidades de `currency` por 1 EUR (serie EXR D.<CURRENCY>.EUR.SP00.A).
  #
  # OJO CON LA DIRECCION: D.USD.EUR.SP00.A son USD POR 1 EUR, no al reves.
  # Invertirla deja el EUR a ~3.700 COP en vez de ~4.500 y nadie lo nota hasta
  # el cierre contable.
  def ecb_units_per_eur(currency:, date:)
    code = Currency.normalize(currency)
    # La serie D.EUR.EUR no existe: pedirla devolveria 404. Por definicion, 1
    # EUR vale 1 EUR.
    return Quote.new(rate: BigDecimal("1"), effective_date: date, valid_until: date) if code == "EUR"

    response = HTTParty.get("#{ecb_url}/D.#{code}.EUR.SP00.A",
                            query: {
                              "startPeriod" => (date - LOOKBACK_DAYS).strftime("%Y-%m-%d"),
                              "endPeriod"   => date.strftime("%Y-%m-%d"),
                              "format"      => "csvdata",
                              "detail"      => "dataonly"
                            },
                            open_timeout: open_timeout,
                            timeout: read_timeout)

    return nil unless response.code.to_i == 200

    self.class.parse_ecb_csv(response.body, upto: date)
  rescue *ERRORES_DE_RED => e
    Rails.logger.warn("[ExchangeRateClient] #{e.class}: #{e.message}")
    nil
  end

  # Unidades de `currency` por 1 USD, vigentes en `date`.
  #
  # OJO CON LA DIRECCION, igual que en el BCE: usd.json trae "dop" => 58.9, que es
  # DOP POR 1 USD. Quien divida al reves deja el peso dominicano en 0,0189 COP.
  #
  # Se intenta el CDN y, si no responde 200 o no trae la moneda, el endpoint de
  # respaldo (mismos datos, otro origen). No es un fallback ENTRE FUENTES —eso
  # ensuciaria `source`— sino entre dos espejos de la MISMA fuente.
  def units_per_usd(currency:, date:)
    code = Currency.normalize(currency)
    ver  = date.strftime("%Y-%m-%d")

    cross_usd_request_url(ver: ver).each do |url|
      cuerpo = cuerpo_de(url)
      next if cuerpo.nil?

      quote = self.class.parse_cross_usd(cuerpo, currency: code, upto: date)
      return quote unless quote.nil?
    end

    nil
  end

  private def cuerpo_de(url)
    response = HTTParty.get(url,
                            headers: { "Accept" => "application/json" },
                            open_timeout: open_timeout,
                            timeout: read_timeout)
    # 404 en fecha futura, inexistente o anterior a ~mediados de 2024.
    return nil unless response.code.to_i == 200

    response.body
  rescue *ERRORES_DE_RED => e
    Rails.logger.warn("[ExchangeRateClient] #{e.class}: #{e.message}")
    nil
  end

  # --- parsers puros, sin red: son el punto de prueba real ------------------

  # BigDecimal(str) y NUNCA str.to_f: 120 * 4120.5 en Float da
  # 494459.99999999994 y ese centavo se propaga al centro de costos.
  def self.parse_trm(body, upto:)
    filas = JSON.parse(body.to_s)
    return nil unless filas.is_a?(Array) && filas.any?

    fila = filas.first
    return nil unless fila.is_a?(Hash)

    rate = BigDecimal(fila["valor"].to_s)
    return nil if rate <= 0

    effective   = Date.parse(fila["vigenciadesde"].to_s)
    valid_until = Date.parse(fila["vigenciahasta"].to_s)

    # Una vigencia futura significa que la fuente devolvio otra cosa de la que
    # se le pidio; una de hace 40 dias, que el dataset dejo de actualizarse.
    return nil if effective > upto
    return nil if (upto - effective).to_i > LOOKBACK_DAYS

    Quote.new(rate: rate, effective_date: effective, valid_until: [valid_until, upto].max)
  rescue *ERRORES_DE_RED => e
    Rails.logger.warn("[ExchangeRateClient] #{e.class}: #{e.message}")
    nil
  end

  # Columnas POR NOMBRE, nunca por posicion: el BCE agrega y reordena columnas
  # de metadatos entre versiones del portal y un indice fijo devuelve la serie
  # equivocada sin fallar.
  def self.parse_ecb_csv(body, upto:)
    tabla = CSV.parse(body.to_s, headers: true)
    return nil if tabla.headers.blank?
    return nil unless tabla.headers.include?("TIME_PERIOD") && tabla.headers.include?("OBS_VALUE")

    observaciones = tabla.filter_map do |fila|
      fecha  = a_fecha(fila["TIME_PERIOD"])
      numero = a_decimal(fila["OBS_VALUE"])
      next if fecha.nil? || numero.nil? || numero <= 0
      # Las observaciones posteriores a la fecha pedida se ignoran: causar un
      # gasto con una tasa que todavia no existia es un error contable.
      next if fecha > upto

      [fecha, numero]
    end

    fecha, numero = observaciones.max_by(&:first)
    return nil if fecha.nil?
    return nil if (upto - fecha).to_i > LOOKBACK_DAYS

    Quote.new(rate: numero, effective_date: fecha, valid_until: upto)
  rescue *ERRORES_DE_RED => e
    Rails.logger.warn("[ExchangeRateClient] #{e.class}: #{e.message}")
    nil
  end

  # Claves en minuscula. BigDecimal via a_decimal y NUNCA .to_f.
  def self.parse_cross_usd(body, currency:, upto:)
    json = JSON.parse(body.to_s)
    return nil unless json.is_a?(Hash)

    tabla = json["usd"]
    return nil unless tabla.is_a?(Hash)

    numero = a_decimal(tabla[Currency.normalize(currency).downcase])
    return nil if numero.nil? || numero <= 0

    fecha = a_fecha(json["date"])
    return nil if fecha.nil?
    return nil if fecha > upto
    return nil if (upto - fecha).to_i > LOOKBACK_DAYS

    Quote.new(rate: numero, effective_date: fecha, valid_until: upto)
  rescue *ERRORES_DE_RED => e
    Rails.logger.warn("[ExchangeRateClient] #{e.class}: #{e.message}")
    nil
  end

  # Conversores tolerantes: una celda vacia o basura del CSV descarta esa
  # observacion, no la respuesta entera. Rescatan tipos concretos, no
  # StandardError.
  def self.a_fecha(valor)
    texto = valor.to_s.strip
    return nil if texto.blank?

    Date.parse(texto)
  rescue ArgumentError, TypeError
    nil
  end

  def self.a_decimal(valor)
    texto = valor.to_s.strip
    return nil if texto.blank?

    BigDecimal(texto)
  rescue ArgumentError, TypeError
    nil
  end
end

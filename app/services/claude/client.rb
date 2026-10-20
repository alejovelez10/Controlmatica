module Claude
  # POST /v1/messages por HTTP (paquete 17). Sin reintentos propios: quien lo
  # usa decide (la lectura del formulario no reintenta; el job del agente si).
  #
  # NUNCA se loguea la api key ni el cuerpo: ahi van el comprobante y la
  # conversacion de la persona.
  class Client
    class Error < StandardError
      attr_reader :status, :tipo

      def initialize(mensaje, status: nil, tipo: nil)
        super(mensaje)
        @status = status
        @tipo = tipo
      end

      # 429 (limite), 529 (sobrecarga) y 5xx se reintentan; un 400 no.
      def transitorio?
        status.to_i == 408 || status.to_i == 409 || status.to_i == 429 || status.to_i >= 500 ||
          %w[rate_limit_error overloaded_error api_error].include?(tipo.to_s)
      end
    end

    # La llamada no termino a tiempo. Subclase aparte para que la lectura del
    # formulario la mapee a :timeout y no a :provider_error.
    class Timeout < Error; end

    def initialize(api_key: Claude.api_key, conexion: nil, open_timeout: 5, read_timeout: 120)
      @api_key = api_key
      @conexion = conexion || Faraday.new(url: API_HOST) do |f|
        f.options.open_timeout = open_timeout
        f.options.timeout = read_timeout
      end
    end

    # => Hash con la respuesta de la API (content, stop_reason, usage, ...).
    def mensajes(cuerpo, betas: [])
      cuerpo, betas = Claude.preparar(cuerpo, betas: betas)
      respuesta = @conexion.post("/v1/messages") do |req|
        req.headers["x-api-key"] = @api_key.to_s
        req.headers["anthropic-version"] = API_VERSION
        req.headers["anthropic-beta"] = betas.join(",") if betas.any?
        req.headers["content-type"] = "application/json"
        req.body = JSON.generate(cuerpo)
      end
      datos = leer_json(respuesta.body)
      return datos if respuesta.success?

      error = datos["error"] || {}
      raise Error.new(error["message"].presence || "HTTP #{respuesta.status}",
                      status: respuesta.status, tipo: error["type"])
    rescue Faraday::TimeoutError, Faraday::ConnectionFailed => e
      raise Timeout.new("Claude no respondio a tiempo (#{e.class})", status: 408)
    end

    private

    def leer_json(cuerpo)
      return cuerpo if cuerpo.is_a?(Hash)

      JSON.parse(cuerpo.to_s)
    rescue JSON::ParserError
      {}
    end
  end
end

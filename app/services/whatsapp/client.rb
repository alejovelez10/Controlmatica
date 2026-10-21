module Whatsapp
  # Cliente HTTP de la WhatsApp Cloud API de Meta (paquete 17).
  #
  # HTTP directo con Faraday y no la gema `whatsapp_sdk`: la 1.2.0 trae por
  # defecto la v19.0 de la Graph API, ya vencida, y rechaza la v26. Son pocos
  # endpoints y la version queda fija por ENV (WHATSAPP_GRAPH_VERSION).
  #
  # NUNCA se loguea el token, ni la URL firmada de un archivo, ni el cuerpo de
  # un mensaje: ahi viajan la credencial y datos de la persona.
  class Client
    # Errores en los que reintentar tiene sentido: Meta caido o limite de
    # velocidad. Un 400 por datos invalidos no se arregla reintentando.
    CODIGOS_TRANSITORIOS = [
      1, 2, 4, 17, 32, 613,  # limites y errores temporales de la Graph API
      130_429,               # limite de throughput
      131_016,               # servicio no disponible
      131_056,               # demasiados mensajes seguidos a la misma persona
      133_004                # servidor no disponible
    ].freeze

    class Error < StandardError
      attr_reader :codigo, :http_status

      def initialize(mensaje, codigo: nil, http_status: nil)
        super(mensaje)
        @codigo = codigo
        @http_status = http_status
      end

      def transitorio?
        http_status.to_i >= 500 || http_status.to_i == 429 ||
          CODIGOS_TRANSITORIOS.include?(codigo.to_i)
      end
    end

    # Limites de Meta para los mensajes interactivos. Se recortan aqui y no se
    # dejan fallar: un boton de 21 caracteres no debe costarle la respuesta a
    # nadie.
    MAX_TEXTO = 4096
    MAX_CUERPO_BOTONES = 1024
    MAX_BOTONES = 3
    MAX_TITULO_BOTON = 20
    MAX_FILAS_LISTA = 10
    MAX_TITULO_FILA = 24
    MAX_DESCRIPCION_FILA = 72
    MAX_BYTES_ARCHIVO = 20.megabytes

    # Faraday desarma la query de la URL y la vuelve a armar ORDENADA
    # (sort_params). La URL del archivo (lookaside.fbsbx.com) viene firmada y
    # con el orden cambiado Meta responde 401: visto el 2026-10-20 con la
    # primera foto real. Este codificador la arma en el mismo orden.
    module QueryEnOrden
      module_function

      def decode(query)
        Faraday::FlatParamsEncoder.decode(query)
      end

      def encode(params)
        return nil if params.nil? || params.empty?

        params.map do |clave, valor|
          valor.nil? ? Faraday::Utils.escape(clave) : "#{Faraday::Utils.escape(clave)}=#{Faraday::Utils.escape(valor)}"
        end.join("&")
      end
    end

    TIMEOUT_CONEXION = 3
    TIMEOUT_LECTURA = 20

    def initialize(conexion: nil, token: Whatsapp.token, phone_number_id: Whatsapp.phone_number_id,
                   version: Whatsapp.graph_version)
      @token = token
      @phone_number_id = phone_number_id
      @version = version
      @conexion = conexion || Faraday.new(url: GRAPH_HOST) do |f|
        f.options.open_timeout = TIMEOUT_CONEXION
        f.options.timeout = TIMEOUT_LECTURA
      end
    end

    # --- Mensajes ------------------------------------------------------------

    # `destino` es { wa_id:, bsuid: }. Se prefiere el telefono: Meta lo
    # recomienda para seguir recibiendo telefonos en los webhooks; el BSUID es
    # para quien adopto un nombre de usuario y no compartio el numero.
    # Devuelve el wamid del mensaje enviado.
    def enviar_texto(destino, texto, responder_a: nil)
      enviar(destino, { type: "text", text: { preview_url: false, body: recortar(texto, MAX_TEXTO) } },
             responder_a: responder_a)
    end

    # botones: [{ id:, titulo: }], maximo 3.
    def enviar_botones(destino, texto, botones, pie: nil, responder_a: nil)
      interactivo = {
        type: "button",
        body: { text: recortar(texto, MAX_CUERPO_BOTONES) },
        action: { buttons: botones.first(MAX_BOTONES).map do |boton|
          { type: "reply", reply: { id: boton[:id].to_s, title: recortar(boton[:titulo], MAX_TITULO_BOTON) } }
        end }
      }
      interactivo[:footer] = { text: recortar(pie, 60) } if pie.present?
      enviar(destino, { type: "interactive", interactive: interactivo }, responder_a: responder_a)
    end

    # filas: [{ id:, titulo:, descripcion: }], maximo 10.
    def enviar_lista(destino, texto, boton:, filas:, responder_a: nil)
      interactivo = {
        type: "list",
        body: { text: recortar(texto, MAX_TEXTO) },
        action: {
          button: recortar(boton, MAX_TITULO_BOTON),
          sections: [{ rows: filas.first(MAX_FILAS_LISTA).map do |fila|
            { id: fila[:id].to_s, title: recortar(fila[:titulo], MAX_TITULO_FILA),
              description: recortar(fila[:descripcion], MAX_DESCRIPCION_FILA) }.compact
          end }]
        }
      }
      enviar(destino, { type: "interactive", interactive: interactivo }, responder_a: responder_a)
    end

    # Plantilla aprobada por Meta: lo unico que se puede mandar fuera de la
    # ventana de 24 h desde el ultimo mensaje de la persona. `parametros`
    # reemplaza, en orden, los {{1}}, {{2}}... del cuerpo.
    def enviar_plantilla(destino, nombre, idioma: "es", parametros: [])
      plantilla = { name: nombre, language: { code: idioma } }
      if parametros.any?
        plantilla[:components] = [{ type: "body",
                                    parameters: parametros.map { |p| { type: "text", text: p.to_s } } }]
      end
      enviar(destino, { type: "template", template: plantilla })
    end

    # Marca el mensaje como leido y, si se pide, muestra "escribiendo..." (Meta
    # lo quita al responder o a los 25 s).
    def marcar_leido(wamid, escribiendo: true)
      cuerpo = { messaging_product: "whatsapp", status: "read", message_id: wamid }
      cuerpo[:typing_indicator] = { type: "text" } if escribiendo
      post("#{@phone_number_id}/messages", cuerpo)
      true
    end

    # --- Archivos ------------------------------------------------------------

    # El id del archivo dura 7 dias; la URL que devuelve Meta, 5 MINUTOS, y se
    # descarga con el mismo token. Por eso se pide la URL justo antes de bajar.
    # => { bytes:, mime:, tamano: }
    def descargar_media(media_id)
      info = get(media_id.to_s)
      tamano = info["file_size"].to_i
      raise Error.new("El archivo pesa mas de #{MAX_BYTES_ARCHIVO / 1.megabyte} MB") if tamano > MAX_BYTES_ARCHIVO

      respuesta = @conexion.get(info["url"]) do |req|
        req.headers["Authorization"] = "Bearer #{@token}"
        req.options.timeout = 60
        req.options.params_encoder = QueryEnOrden
      end
      unless respuesta.success?
        raise Error.new("Meta no entrego el archivo (HTTP #{respuesta.status})", http_status: respuesta.status)
      end

      bytes = respuesta.body.to_s.b
      raise Error.new("El archivo pesa mas de #{MAX_BYTES_ARCHIVO / 1.megabyte} MB") if bytes.bytesize > MAX_BYTES_ARCHIVO

      { bytes: bytes, mime: info["mime_type"].to_s.split(";").first&.strip, tamano: bytes.bytesize }
    rescue Faraday::Error => e
      raise Error.new("No se pudo descargar el archivo: #{e.class}", http_status: 503)
    end

    # --- Administracion del numero (registro) -------------------------------

    def estado_numero
      get(@phone_number_id.to_s,
          fields: "display_phone_number,verified_name,code_verification_status,name_status," \
                  "status,quality_rating,platform_type,account_mode")
    end

    def solicitar_codigo(metodo: "SMS", idioma: "es")
      post("#{@phone_number_id}/request_code", { code_method: metodo, language: idioma })
    end

    def verificar_codigo(codigo)
      post("#{@phone_number_id}/verify_code", { code: codigo.to_s })
    end

    # El PIN de 6 digitos queda como verificacion en dos pasos del numero.
    def registrar(pin)
      post("#{@phone_number_id}/register", { messaging_product: "whatsapp", pin: pin.to_s })
    end

    # Sin esta suscripcion la app no recibe los webhooks de la cuenta de
    # WhatsApp, aunque la URL del webhook este configurada en la app.
    def suscribir_app(waba_id)
      post("#{waba_id}/subscribed_apps", {})
    end

    private

    def enviar(destino, contenido, responder_a: nil)
      cuerpo = { messaging_product: "whatsapp", recipient_type: "individual" }
      if destino[:wa_id].present?
        cuerpo[:to] = destino[:wa_id].to_s
      elsif destino[:bsuid].present?
        cuerpo[:recipient] = destino[:bsuid].to_s
      else
        raise Error.new("Sin destinatario: no hay telefono ni BSUID")
      end
      cuerpo[:context] = { message_id: responder_a } if responder_a.present?
      respuesta = post("#{@phone_number_id}/messages", cuerpo.merge(contenido))
      Array(respuesta["messages"]).first&.dig("id")
    end

    def get(ruta, params = {})
      solicitar(:get, ruta, params)
    end

    def post(ruta, cuerpo)
      solicitar(:post, ruta, cuerpo)
    end

    def solicitar(metodo, ruta, datos)
      respuesta = @conexion.public_send(metodo, "/#{@version}/#{ruta}") do |req|
        req.headers["Authorization"] = "Bearer #{@token}"
        if metodo == :get
          req.params.update(datos)
        else
          req.headers["Content-Type"] = "application/json"
          req.body = JSON.generate(datos)
        end
      end
      cuerpo = leer_json(respuesta.body)
      return cuerpo if respuesta.success?

      error = cuerpo["error"] || {}
      raise Error.new(error["message"].presence || "HTTP #{respuesta.status}",
                      codigo: error["code"], http_status: respuesta.status)
    rescue Faraday::Error => e
      raise Error.new("Sin conexion con Meta: #{e.class}", http_status: 503)
    end

    def leer_json(cuerpo)
      return cuerpo if cuerpo.is_a?(Hash)

      JSON.parse(cuerpo.to_s)
    rescue JSON::ParserError
      {}
    end

    def recortar(texto, maximo)
      return nil if texto.nil?

      texto = texto.to_s
      texto.length > maximo ? "#{texto[0, maximo - 1]}…" : texto
    end
  end
end

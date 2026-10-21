module Whatsapp
  # Atiende UN mensaje entrante ya guardado (paquete 17): identifica a la
  # persona, guarda el archivo si trae uno y contesta.
  #
  # FASE 1: contesta "Recibido". La fase 2 reemplaza `responder` por el agente.
  class Atencion
    RECIBIDO = (
      "Recibido ✅. Este es el nuevo canal de Controlmatica; muy pronto vas a poder " \
      "registrar tus gastos y reportes de servicio por aquí."
    ).freeze

    NO_SOPORTADO = (
      "Por ahora solo puedo leer texto, fotos, PDF y notas de voz. ¿Me lo envías de otra forma?"
    ).freeze

    TIPOS_SOPORTADOS = %w[text image document audio interactive button].freeze

    # Su rol no tiene ninguna accion de la seccion "Agente de WhatsApp" de Roles.
    SIN_PERMISO = (
      "Tu rol en Controlmatica no tiene habilitado el asistente de WhatsApp. Si lo necesitas, " \
      "pídele al administrador que te lo active."
    ).freeze

    def initialize(mensaje, client: Client.new)
      @mensaje = mensaje
      @client = client
    end

    def call
      destino = { wa_id: @mensaje.wa_id, bsuid: @mensaje.bsuid }
      respondedor = Respondedor.new(destino: destino, client: @client)
      respondedor.marcar_leido(@mensaje.wamid)

      # "vincular <token>" va ANTES de identificar: justo lo manda quien todavia
      # no se puede identificar (fase 4, Whatsapp::Vinculo).
      if Vinculo.pedido?(@mensaje.body)
        vinculado, respuesta = Vinculo.vincular(@mensaje)
        @mensaje.update!(user: vinculado) if vinculado
        respondedor.texto(respuesta)
        return terminar!(nil)
      end

      identidad = Identidad.resolver(wa_id: @mensaje.wa_id, bsuid: @mensaje.bsuid)
      unless identidad.encontrado?
        respondedor.texto(Identidad.mensaje_para(identidad.motivo))
        return terminar!(nil)
      end

      usuario = identidad.usuario
      # Antes de abrir conversacion o bajar el archivo: sin permiso no se gasta
      # nada, ni siquiera una llamada al modelo.
      unless Agente::Permisos.para(usuario).alguno?
        @mensaje.update!(user: usuario)
        respondedor.texto(SIN_PERMISO)
        return terminar!(nil)
      end

      conversacion = WhatsappConversation.vigente_para(user: usuario, wa_id: @mensaje.wa_id,
                                                      bsuid: @mensaje.bsuid)
      conversacion.update!(last_inbound_at: Time.current, user: usuario)
      @mensaje.update!(user: usuario, whatsapp_conversation: conversacion)

      respondedor = Respondedor.new(destino: destino, usuario: usuario, conversacion: conversacion,
                                    client: @client)
      unless TIPOS_SOPORTADOS.include?(@mensaje.message_type)
        respondedor.texto(NO_SOPORTADO)
        return terminar!(conversacion)
      end

      if @mensaje.con_archivo? && @mensaje.media_file.blank? && !guardar_archivo
        respondedor.texto(ARCHIVO_ILEGIBLE)
        return terminar!(conversacion)
      end

      responder(respondedor, usuario, conversacion)
      terminar!(conversacion)
    end

    ARCHIVO_ILEGIBLE = (
      "No pude abrir ese archivo. Envíame una foto, un PDF o una nota de voz de menos de 20 MB."
    ).freeze

    EXTENSIONES = {
      "image/jpeg" => ".jpg", "image/png" => ".png", "image/webp" => ".webp", "image/heic" => ".heic",
      "application/pdf" => ".pdf", "audio/ogg" => ".ogg", "audio/opus" => ".opus",
      "audio/mpeg" => ".mp3", "audio/mp4" => ".m4a", "audio/aac" => ".aac", "audio/amr" => ".amr"
    }.freeze

    private

    # Sin la api key de Claude (o sin MCP_API_KEY) el canal sigue vivo y
    # contesta "Recibido": asi se puede encender el numero antes que el agente.
    def responder(respondedor, usuario, conversacion)
      return respondedor.texto(RECIBIDO) unless Agente.configurado?

      Agente::Turno.new(mensaje: @mensaje, usuario: usuario, conversacion: conversacion,
                        respondedor: respondedor).call
    end

    # La URL de Meta vence a los 5 minutos: se baja en cuanto se atiende el
    # mensaje y queda en S3 para adjuntarla al gasto despues.
    #
    # false si el archivo no sirve (muy grande, o un tipo que el uploader no
    # acepta, como un .docx). Un error TRANSITORIO de Meta sube: el job lo
    # reintenta, y el id del archivo dura 7 dias.
    def guardar_archivo
      descarga = @client.descargar_media(@mensaje.media_id)
      mime = @mensaje.media_mime.presence || descarga[:mime]
      nombre = @mensaje.media_filename.presence || "whatsapp-#{@mensaje.id}#{EXTENSIONES.fetch(mime.to_s, '')}"

      Tempfile.create(["whatsapp", File.extname(nombre)], binmode: true) do |archivo|
        archivo.write(descarga[:bytes])
        archivo.rewind
        @mensaje.media_file = CarrierWave::SanitizedFile.new(tempfile: archivo, filename: nombre,
                                                             content_type: mime)
        @mensaje.media_mime = mime
        @mensaje.media_filename = nombre
        next true if @mensaje.save

        # El uploader lo rechazo: se descarta lo asignado para que el
        # `update!` final no vuelva a tropezar con el mismo archivo.
        @mensaje.reload
        false
      end
    rescue Client::Error => e
      raise if e.transitorio?

      Rails.logger.warn("[whatsapp] archivo #{@mensaje.wamid} descartado: #{e.message}")
      false
    end

    def terminar!(conversacion)
      @mensaje.update!(status: "procesado", processed_at: Time.current,
                       whatsapp_conversation: conversacion || @mensaje.whatsapp_conversation)
    end
  end
end

module Agente
  # Convierte el historial guardado en lo que se le manda a Claude (paquete 17).
  #
  # En la base, una foto o un PDF se guarda como REFERENCIA al mensaje de
  # WhatsApp que lo trajo (`source.type = "whatsapp_media"`): meter el base64 en
  # el jsonb de la conversacion reescribiria megas en cada turno. Al enviar se
  # reemplaza por el base64 del archivo guardado en S3. Siempre los mismos
  # bytes: Claude liga su razonamiento al contenido exacto de cada turno.
  module Historial
    TIPO_REFERENCIA = "whatsapp_media".freeze
    TIPOS_IMAGEN = %w[image/jpeg image/png image/gif image/webp].freeze

    # Claude reduce las imagenes por encima de ~2576 px de lado; mas grande
    # solo pesa y tarda.
    LADO_MAXIMO = 2576
    BYTES_SIN_REDUCIR = 3.megabytes

    module_function

    def referencia(mensaje)
      tipo = mensaje.media_mime == "application/pdf" ? "document" : "image"
      { "type" => tipo, "source" => { "type" => TIPO_REFERENCIA, "whatsapp_message_id" => mensaje.id } }
    end

    def expandir(mensajes)
      cache = {}
      mensajes.map do |mensaje|
        contenido = mensaje["content"]
        next mensaje unless contenido.is_a?(Array)

        mensaje.merge("content" => contenido.map { |bloque| expandir_bloque(bloque, cache) })
      end
    end

    def expandir_bloque(bloque, cache)
      return bloque unless bloque.is_a?(Hash) && bloque.dig("source", "type") == TIPO_REFERENCIA

      id = bloque.dig("source", "whatsapp_message_id")
      fuente = (cache[id] ||= fuente_base64(id))
      return { "type" => "text", "text" => "[El archivo que mandó la persona ya no está disponible]" } unless fuente

      { "type" => fuente[:tipo], "source" => { "type" => "base64", "media_type" => fuente[:mime],
                                              "data" => fuente[:data] } }
    end

    def fuente_base64(id)
      mensaje = WhatsappMessage.find_by(id: id)
      return nil unless mensaje&.media_file.present?

      bytes = mensaje.media_file.read.to_s.b
      if mensaje.media_mime == "application/pdf"
        return { tipo: "document", mime: "application/pdf", data: Base64.strict_encode64(bytes) }
      end

      bytes, mime = imagen_para_claude(bytes, mensaje.media_mime)
      return nil unless bytes

      { tipo: "image", mime: mime, data: Base64.strict_encode64(bytes) }
    rescue StandardError => e
      Rails.logger.error("[agente] no se pudo leer el archivo #{id}: #{e.class}: #{e.message}")
      nil
    end

    # Claude no lee HEIC (las fotos de iPhone) y las fotos grandes conviene
    # achicarlas. libvips ya viene en las imagenes base de Heroku. La conversion
    # es determinista: la misma foto da los mismos bytes en cada turno.
    def imagen_para_claude(bytes, mime)
      return [bytes, mime] if TIPOS_IMAGEN.include?(mime) && bytes.bytesize <= BYTES_SIN_REDUCIR

      Tempfile.create(["whatsapp", ".img"], binmode: true) do |origen|
        origen.write(bytes)
        origen.flush
        salida = ImageProcessing::Vips.source(origen.path)
                                      .resize_to_limit(LADO_MAXIMO, LADO_MAXIMO)
                                      .convert("jpeg").saver(quality: 85, strip: true).call
        begin
          [File.binread(salida.path), "image/jpeg"]
        ensure
          salida.close!
        end
      end
    rescue StandardError, LoadError => e
      Rails.logger.warn("[agente] no se pudo convertir la imagen (#{mime}): #{e.class}: #{e.message}")
      TIPOS_IMAGEN.include?(mime) ? [bytes, mime] : nil
    end
  end
end

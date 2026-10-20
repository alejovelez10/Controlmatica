module Whatsapp
  # Lee el JSON del webhook de Meta y lo deja en hashes planos (paquete 17).
  #
  # Forma del webhook: entry[].changes[].value con metadata.phone_number_id,
  # contacts[], messages[] y statuses[]. Los avisos de entrega (`statuses`)
  # llegan por el MISMO webhook que los mensajes: hay que separarlos o cada
  # acuse de recibo se procesaria como si alguien hubiera escrito.
  module Entrante
    module_function

    # Cada `value` del webhook que corresponde a NUESTRO numero. La cuenta de
    # WhatsApp tiene otro numero (el 316) que no es de este proyecto: si la app
    # esta suscrita a la cuenta entera, sus mensajes tambien llegan aqui.
    def valores(payload, phone_number_id: Whatsapp.phone_number_id)
      Array(payload["entry"]).flat_map { |entry| Array(entry["changes"]) }
                             .filter_map { |change| change["value"] }
                             .select { |value| value.dig("metadata", "phone_number_id").to_s == phone_number_id.to_s }
    end

    # => [{ wamid:, wa_id:, bsuid:, nombre:, tipo:, texto:, media_id:, ... }]
    def mensajes(value)
      contacto = Array(value["contacts"]).first || {}
      Array(value["messages"]).map { |mensaje| normalizar(mensaje, contacto) }
    end

    def estados(value)
      Array(value["statuses"]).map do |estado|
        { wamid: estado["id"], estado: estado["status"],
          error: Array(estado["errors"]).map { |e| e["title"] || e["message"] }.compact.join("; ").presence }
      end
    end

    # El telefono (`from`, `wa_id`) PUEDE FALTAR desde que existen los nombres
    # de usuario de WhatsApp; el BSUID (`from_user_id`, `user_id`) siempre llega.
    def normalizar(mensaje, contacto = {})
      tipo = mensaje["type"].to_s
      base = {
        wamid: mensaje["id"],
        wa_id: mensaje["from"].presence || contacto["wa_id"].presence,
        bsuid: mensaje["from_user_id"].presence || contacto["user_id"].presence,
        nombre: contacto.dig("profile", "name"),
        tipo: tipo,
        contexto_id: mensaje.dig("context", "id"),
        texto: nil, media_id: nil, media_mime: nil, media_filename: nil,
        boton_id: nil
      }
      base.merge(por_tipo(tipo, mensaje))
    end

    def por_tipo(tipo, mensaje)
      case tipo
      when "text"
        { texto: mensaje.dig("text", "body") }
      when "image", "document", "audio", "video", "sticker"
        archivo = mensaje[tipo] || {}
        { texto: archivo["caption"], media_id: archivo["id"],
          media_mime: archivo["mime_type"].to_s.split(";").first&.strip,
          media_filename: archivo["filename"] }
      when "interactive"
        respuesta = mensaje.dig("interactive", "button_reply") ||
                    mensaje.dig("interactive", "list_reply") || {}
        { texto: respuesta["title"], boton_id: respuesta["id"] }
      when "button"
        # Respuesta rapida de una plantilla.
        { texto: mensaje.dig("button", "text"), boton_id: mensaje.dig("button", "payload") }
      else
        {}
      end
    end
  end
end

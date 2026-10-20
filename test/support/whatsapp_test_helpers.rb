# frozen_string_literal: true

# Helpers de las pruebas del canal de WhatsApp (paquete 17).
module WhatsappTestHelpers
  PHONE_NUMBER_ID = "1282550828280577"
  APP_SECRET = "secreto-de-prueba"

  # Variables del canal encendidas solo mientras dura el bloque.
  def con_whatsapp(habilitado: true, **extra)
    valores = {
      "WHATSAPP_TOKEN" => "token-de-prueba",
      "WHATSAPP_PHONE_NUMBER_ID" => PHONE_NUMBER_ID,
      "META_APP_SECRET" => APP_SECRET,
      "WHATSAPP_VERIFY_TOKEN" => "verificar-123",
      "WHATSAPP_ENABLED" => habilitado ? "true" : "false"
    }.merge(extra.transform_keys(&:to_s))
    anteriores = valores.keys.index_with { |clave| ENV[clave] }
    valores.each { |clave, valor| ENV[clave] = valor }
    yield
  ensure
    anteriores&.each { |clave, valor| ENV[clave] = valor }
  end

  def firmar(cuerpo, secreto = APP_SECRET)
    "sha256=#{OpenSSL::HMAC.hexdigest('SHA256', secreto, cuerpo)}"
  end

  # Un webhook de Meta con UN mensaje, con la forma real (entry/changes/value).
  def webhook_de_mensaje(mensaje, wa_id: "573001234567", bsuid: "CO.bsuid-ingeniero",
                         phone_number_id: PHONE_NUMBER_ID)
    {
      object: "whatsapp_business_account",
      entry: [{
        id: "2318917928941844",
        changes: [{
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "573189262630", phone_number_id: phone_number_id },
            contacts: [{ profile: { name: "Ingeniero" }, wa_id: wa_id, user_id: bsuid }],
            messages: [{ from: wa_id, from_user_id: bsuid, timestamp: "1760900000" }.merge(mensaje)]
          }
        }]
      }]
    }
  end

  def mensaje_de_texto(texto, id: "wamid.texto.1")
    { id: id, type: "text", text: { body: texto } }
  end

  def mensaje_de_documento(id: "wamid.doc.1", media_id: "media-123")
    { id: id, type: "document",
      document: { id: media_id, mime_type: "application/pdf", filename: "factura.pdf", sha256: "x" } }
  end
end

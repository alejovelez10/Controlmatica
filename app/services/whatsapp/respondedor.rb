module Whatsapp
  # Envia mensajes a UNA persona y deja cada uno registrado como saliente
  # (paquete 17). El wamid que devuelve Meta es el que despues trae el aviso de
  # entrega (`statuses`) y lo que permite saber si el mensaje llego.
  class Respondedor
    attr_reader :destino

    def initialize(destino:, usuario: nil, conversacion: nil, client: Client.new)
      @destino = destino.slice(:wa_id, :bsuid)
      @usuario = usuario
      @conversacion = conversacion
      @client = client
    end

    def texto(cuerpo, responder_a: nil)
      registrar("text", cuerpo) { @client.enviar_texto(@destino, cuerpo, responder_a: responder_a) }
    end

    def botones(cuerpo, botones, pie: nil, responder_a: nil)
      registrar("interactive", cuerpo, botones: botones) do
        @client.enviar_botones(@destino, cuerpo, botones, pie: pie, responder_a: responder_a)
      end
    end

    def lista(cuerpo, boton:, filas:, responder_a: nil)
      registrar("interactive", cuerpo, filas: filas) do
        @client.enviar_lista(@destino, cuerpo, boton: boton, filas: filas, responder_a: responder_a)
      end
    end

    # Best effort: que no se vea el "leido" no es razon para no contestar.
    def marcar_leido(wamid)
      @client.marcar_leido(wamid, escribiendo: true)
    rescue Client::Error => e
      Rails.logger.warn("[whatsapp] no se pudo marcar como leido: #{e.message}")
      false
    end

    private

    def registrar(tipo, cuerpo, extra = {})
      wamid = yield
      WhatsappMessage.create!(
        wamid: wamid.presence || "local-#{SecureRandom.uuid}",
        direction: WhatsappMessage::SALIENTE,
        user: @usuario, whatsapp_conversation: @conversacion,
        wa_id: @destino[:wa_id], bsuid: @destino[:bsuid],
        message_type: tipo, body: cuerpo, payload: extra,
        status: "enviado", processed_at: Time.current
      )
      wamid
    end
  end
end

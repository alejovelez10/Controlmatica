module Webhooks
  # Webhook de la WhatsApp Cloud API de Meta (paquete 17).
  #
  # Hereda de ActionController::Base, no de ApplicationController: lo llama
  # Meta, no una persona con sesion, y la autenticacion es la firma
  # X-Hub-Signature-256 con el App Secret.
  #
  # TRES COSAS QUE HACE SIEMPRE (las mismas lecciones del webhook de Meta de
  # Taimes):
  # 1. Contesta 200 en milisegundos y encola: Meta reintenta hasta 7 dias si
  #    no recibe 200 y manda lotes de hasta mil eventos; un item malformado no
  #    puede tumbar el lote entero.
  # 2. Deduplica por wamid (indice unico): los reintentos de Meta repiten
  #    mensajes y sin esto el agente contestaria dos veces.
  # 3. Separa los avisos de entrega (`statuses`) de los mensajes.
  class WhatsappController < ActionController::Base
    skip_forgery_protection

    # GET de alta del webhook: Meta manda hub.mode, hub.verify_token y
    # hub.challenge, y espera el challenge tal cual. Funciona aunque el canal
    # este apagado, para poder conectar el webhook antes de encenderlo.
    def verify
      token = Whatsapp.verify_token
      if params["hub.mode"] == "subscribe" && token.present? &&
         ActiveSupport::SecurityUtils.secure_compare(params["hub.verify_token"].to_s, token)
        render plain: params["hub.challenge"].to_s
      else
        head :forbidden
      end
    end

    def receive
      return head(:ok) unless Whatsapp.habilitado?

      cuerpo = request.raw_post
      unless Whatsapp::Firma.valida?(cuerpo, request.headers["X-Hub-Signature-256"])
        Rails.logger.warn("[whatsapp] webhook con firma invalida descartado")
        return head(:unauthorized)
      end

      payload = JSON.parse(cuerpo)
      Whatsapp::Entrante.valores(payload).each { |value| procesar_valor(value) }
      head :ok
    rescue JSON::ParserError
      head :ok
    end

    private

    def procesar_valor(value)
      Whatsapp::Entrante.mensajes(value).each { |datos| registrar_mensaje(datos, value) }
      Whatsapp::Entrante.estados(value).each { |estado| actualizar_estado(estado) }
    end

    def registrar_mensaje(datos, value)
      return if datos[:wamid].blank?

      crudo = Array(value["messages"]).find { |m| m["id"] == datos[:wamid] } || {}
      mensaje = WhatsappMessage.registrar_entrante(datos, crudo)
      return if mensaje.nil? # reintento de Meta: ya estaba

      Whatsapp::InboundJob.perform_later(mensaje.id, mensaje.remitente)
    rescue StandardError => e
      Rails.logger.error("[whatsapp] no se pudo registrar #{datos[:wamid]}: #{e.class}: #{e.message}")
    end

    def actualizar_estado(estado)
      return if estado[:wamid].blank?

      cambios = { status: estado[:estado], updated_at: Time.current }
      cambios[:error] = estado[:error] if estado[:error].present?
      WhatsappMessage.salientes.where(wamid: estado[:wamid]).update_all(cambios)
    rescue StandardError => e
      Rails.logger.error("[whatsapp] estado #{estado[:wamid]}: #{e.class}: #{e.message}")
    end
  end
end

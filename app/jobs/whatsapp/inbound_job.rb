module Whatsapp
  # Atiende un mensaje entrante fuera del request del webhook (paquete 17).
  #
  # UN MENSAJE A LA VEZ POR PERSONA (`perform_limit: 1` con la llave del
  # remitente): si alguien manda la foto y enseguida "es del centro ACME", el
  # segundo espera a que termine el primero en vez de correr en paralelo sobre
  # la misma conversacion. Con otro adaptador de cola (test, desarrollo) GoodJob
  # no aplica el limite.
  class InboundJob < ApplicationJob
    include GoodJob::ActiveJobExtensions::Concurrency

    queue_as :whatsapp

    good_job_control_concurrency_with(perform_limit: 1, key: -> { "whatsapp-#{arguments.second}" })

    # Meta caido o limite de velocidad: se reintenta. El id del archivo dura 7
    # dias, de sobra para estos reintentos.
    retry_on Whatsapp::Client::Error, wait: :exponentially_longer, attempts: 5 do |job, error|
      job.marcar_fallido(error)
    end

    def perform(whatsapp_message_id, _remitente = nil)
      mensaje = WhatsappMessage.find_by(id: whatsapp_message_id)
      return if mensaje.nil? || mensaje.procesado?
      return unless Whatsapp.habilitado?

      mensaje.update!(status: "procesando")
      Atencion.new(mensaje).call
    rescue Whatsapp::Client::Error => e
      raise if e.transitorio?

      marcar_fallido(e)
    end

    def marcar_fallido(error)
      WhatsappMessage.where(id: arguments.first)
                     .update_all(status: "fallido", error: error.message.to_s.first(500), updated_at: Time.current)
      Rails.logger.error("[whatsapp] mensaje #{arguments.first} fallido: #{error.class}: #{error.message}")
    end
  end
end

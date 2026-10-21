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

    # Claude saturado o con limite de velocidad (Agente::Turno solo deja subir
    # los transitorios). Nada del turno se guardo, asi que repetirlo es seguro.
    retry_on Claude::Client::Error, wait: :exponentially_longer, attempts: 4 do |job, error|
      job.marcar_fallido(error)
      job.avisar_fallo
    end

    # Si Claude no se recupero en los reintentos, que la persona no se quede
    # esperando una respuesta que no va a llegar.
    def avisar_fallo
      mensaje = WhatsappMessage.find_by(id: arguments.first)
      return unless mensaje

      Whatsapp::Respondedor.new(destino: { wa_id: mensaje.wa_id, bsuid: mensaje.bsuid }, usuario: mensaje.user)
                           .texto(Agente::Turno::FALLO)
    rescue Whatsapp::Client::Error => e
      Rails.logger.error("[whatsapp] no se pudo avisar el fallo: #{e.message}")
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
    rescue Claude::Client::Error
      raise
    rescue StandardError => e
      # Un error que no es de Meta ni de Claude es un bug: reintentarlo no lo
      # arregla, pero la persona no puede quedarse esperando en silencio (visto
      # el 2026-10-20: faltaba el prompt en produccion y no le llego nada). Se
      # vuelve a levantar para que quede en GoodJob.
      marcar_fallido(e)
      avisar_fallo
      raise
    end

    def marcar_fallido(error)
      WhatsappMessage.where(id: arguments.first)
                     .update_all(status: "fallido", error: error.message.to_s.first(500), updated_at: Time.current)
      Rails.logger.error("[whatsapp] mensaje #{arguments.first} fallido: #{error.class}: #{error.message}")
    end
  end
end

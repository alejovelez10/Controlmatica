module Whatsapp
  # Manda un aviso de aprobacion por WhatsApp (paquete 17, fase 3). Ver
  # Whatsapp::Avisos para cuando se manda y por que.
  class AvisoJob < ApplicationJob
    queue_as :whatsapp

    PLANTILLAS = { "decision" => "WHATSAPP_PLANTILLA_DECISION",
                   "pendiente" => "WHATSAPP_PLANTILLA_PENDIENTE" }.freeze

    retry_on Whatsapp::Client::Error, wait: :exponentially_longer, attempts: 4

    def perform(tipo, report_expense_id, destinatario_id, decisor_id = nil, client: Client.new)
      return unless Avisos.activos?

      gasto = ReportExpense.find_by(id: report_expense_id)
      destinatario = User.find_by(id: destinatario_id)
      return if gasto.nil? || destinatario.nil?

      entrante = Avisos.ultimo_entrante(destinatario)
      return if entrante.nil? # nunca le escribio al numero: le basta el correo

      decisor = decisor_id && User.find_by(id: decisor_id)
      respondedor = Respondedor.new(destino: { wa_id: entrante.wa_id, bsuid: entrante.bsuid },
                                    usuario: destinatario, client: client)
      if Avisos.ventana_abierta?(entrante)
        respondedor.texto(Avisos.texto(tipo, gasto, decisor))
      else
        enviar_plantilla(respondedor, tipo, gasto, decisor, destinatario, client)
      end
    rescue Whatsapp::Client::Error => e
      raise if e.transitorio?

      Rails.logger.error("[whatsapp] aviso #{tipo} del gasto #{report_expense_id}: #{e.message}")
    end

    private

    def enviar_plantilla(respondedor, tipo, gasto, decisor, destinatario, client)
      nombre = ENV[PLANTILLAS.fetch(tipo)].presence
      return Rails.logger.info("[whatsapp] aviso #{tipo} fuera de la ventana y sin plantilla: solo correo") unless nombre

      parametros = Avisos.parametros_de_plantilla(tipo, gasto, decisor)
      wamid = client.enviar_plantilla(respondedor.destino, nombre, idioma: ENV["WHATSAPP_PLANTILLA_IDIOMA"].presence || "es",
                                                                   parametros: parametros)
      WhatsappMessage.create!(wamid: wamid.presence || "local-#{SecureRandom.uuid}", direction: WhatsappMessage::SALIENTE,
                              user: destinatario, wa_id: respondedor.destino[:wa_id],
                              bsuid: respondedor.destino[:bsuid], message_type: "template",
                              body: "#{nombre}: #{parametros.join(' | ')}", status: "enviado", processed_at: Time.current)
    end
  end
end

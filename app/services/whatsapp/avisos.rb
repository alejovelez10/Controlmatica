module Whatsapp
  # Avisos de aprobacion por WhatsApp, junto a los correos (paquete 17, fase 3):
  # la decision sobre un gasto (aprobado o rechazado) y el "tienes un gasto por
  # aprobar" para el dueno del centro.
  #
  # SOLO A QUIEN YA LE ESCRIBIO AL NUMERO: haber escrito es la senal de que la
  # persona usa el canal (Meta exige consentimiento para escribirle primero). Al
  # personal de oficina que nunca lo uso le sigue llegando solo el correo.
  #
  # Dentro de la ventana de 24 h desde su ultimo mensaje se manda texto libre;
  # fuera, Meta solo admite plantillas aprobadas (WHATSAPP_PLANTILLA_*). Sin la
  # plantilla configurada, fuera de la ventana no se manda nada: el correo ya
  # salio.
  module Avisos
    VENTANA = 24.hours
    TIPOS = %w[decision pendiente].freeze

    module_function

    def activos?
      Whatsapp.habilitado? && ENV["WHATSAPP_AVISOS"].to_s.strip.casecmp("true").zero?
    end

    # Lo llaman los callbacks de ReportExpense. Nunca levanta: un aviso no
    # puede tumbar el guardado de un gasto.
    def avisar(tipo, gasto, destinatario, decisor = nil)
      return unless activos? && destinatario && TIPOS.include?(tipo)

      AvisoJob.perform_later(tipo, gasto.id, destinatario.id, decisor&.id)
    rescue StandardError => e
      Rails.logger.error("[whatsapp] no se pudo encolar el aviso #{tipo} del gasto #{gasto&.id}: #{e.message}")
      nil
    end

    # El ultimo mensaje que la persona le mando al numero, o nil si nunca le
    # escribio.
    def ultimo_entrante(usuario)
      WhatsappMessage.entrantes.where(user: usuario).order(:created_at).last
    end

    def ventana_abierta?(entrante, ahora = Time.current)
      entrante.present? && entrante.created_at > ahora - VENTANA
    end

    def texto(tipo, gasto, decisor)
      tipo == "decision" ? texto_decision(gasto, decisor) : texto_pendiente(gasto)
    end

    def texto_decision(gasto, decisor)
      quien = decisor ? " por #{nombre(decisor)}" : ""
      if gasto.rechazado?
        motivo = gasto.rejection_reason.present? ? " Motivo: #{gasto.rejection_reason}" : ""
        "❌ Tu gasto *##{gasto.id}* (#{detalle(gasto)}) fue *rechazado*#{quien}.#{motivo}"
      else
        "✅ Tu gasto *##{gasto.id}* (#{detalle(gasto)}) fue *aprobado*#{quien}."
      end
    end

    def texto_pendiente(gasto)
      lineas = ["📋 Tienes un gasto por aprobar: *##{gasto.id}* de #{nombre(gasto.user_invoice)} " \
                "(#{detalle(gasto)}) en #{gasto.cost_center&.code}."]
      motivo = gasto.motivo_de_retencion
      lineas << "Motivo: #{motivo}" if motivo.present?
      lineas << "Revísalo aquí: #{url_de_aprobacion(gasto)}"
      lineas.join("\n")
    end

    # Los parametros de la plantilla, en el orden de sus {{1}}, {{2}}...
    # (docs/plan-gastos-ia/17-agente-whatsapp-propio.md §7).
    def parametros_de_plantilla(tipo, gasto, decisor)
      if tipo == "decision"
        [nombre(gasto.user_invoice), gasto.id.to_s, detalle(gasto),
         gasto.rechazado? ? "rechazado" : "aprobado", decisor ? nombre(decisor) : "Controlmatica"]
      else
        [nombre(gasto.cost_center&.user_owner), gasto.id.to_s, nombre(gasto.user_invoice), detalle(gasto),
         gasto.cost_center&.code.to_s]
      end
    end

    def detalle(gasto)
      [gasto.invoice_name.presence, ExpenseBudgetService.money(gasto.invoice_total.to_d)].compact.join(", ")
    end

    def nombre(usuario)
      return "" unless usuario

      [usuario.names, usuario.last_names].map(&:to_s).map(&:strip).reject(&:empty?).join(" ").presence ||
        usuario.email.to_s
    end

    def url_de_aprobacion(gasto)
      opciones = Rails.application.config.action_mailer.default_url_options || {}
      Rails.application.routes.url_helpers.expense_approval_url(t: ExpenseApprovalToken.generate(gasto), **opciones)
    end
  end
end

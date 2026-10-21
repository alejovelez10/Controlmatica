module Agente
  # Un turno de conversacion: lo que pasa entre que la persona escribe y el
  # agente contesta (paquete 17).
  #
  # Primero lo que se resuelve SIN el modelo (reiniciar, los botones del
  # borrador, notas de voz); despues, el ciclo con Claude: llamar, ejecutar las
  # tools que pida, devolverle los resultados y repetir hasta que conteste o
  # use una herramienta que termina el turno (ofrecer_opciones, proponer_*).
  class Turno
    COMANDOS_REINICIO = %w[@limpiar @nuevo @reiniciar @olvidar @borrar].freeze
    CONFIRMACIONES_ESCRITAS = %w[si sí confirmo confirmar dale].freeze

    # Las dos betas que usa el agente: mantener el razonamiento atado a la
    # conversacion, degradando en vez de fallar si algo del prefijo cambio.
    BETAS = ["thinking-binding-controls-2026-08-01"].freeze

    REINICIADO = "Listo, empezamos de cero. ¿Qué quieres registrar?".freeze
    SIN_VOZ_TODAVIA = (
      "Todavía no puedo escuchar notas de voz. Escríbeme los datos o mándame la foto del comprobante."
    ).freeze
    NO_TERMINE = (
      "No alcancé a terminar con eso. ¿Me lo repites, quizá por partes? No guardé nada."
    ).freeze
    FALLO = (
      "Tuve un problema procesando tu mensaje y no guardé nada. Intenta de nuevo en un momento."
    ).freeze
    RECHAZO = "No puedo ayudarte con eso. Solo registro gastos y reportes de servicio de Controlmatica.".freeze

    def initialize(mensaje:, usuario:, conversacion:, respondedor:, claude: nil)
      @mensaje = mensaje
      @usuario = usuario
      @conversacion = conversacion
      @respondedor = respondedor
      @claude = claude || Claude::Client.new(read_timeout: 120)
      @permisos = Permisos.para(usuario)
    end

    def call
      texto = @mensaje.body.to_s.strip
      return reiniciar if COMANDOS_REINICIO.include?(texto.downcase)
      return atender_boton_del_borrador if @mensaje.boton_id.to_s.start_with?("borrador:")
      return confirmar_por_texto if confirmacion_escrita?(texto)
      return conversar_por_voz if @mensaje.message_type == "audio"

      conversar
    end

    private

    # --- Sin el modelo -------------------------------------------------------

    def reiniciar
      @conversacion.cerrar!("reinicio")
      @respondedor.texto(REINICIADO)
    end

    def atender_boton_del_borrador
      _, accion, id = @mensaje.boton_id.split(":", 3)
      borrador = Borrador.new(@conversacion, @usuario, @respondedor)
      case accion
      when "confirmar" then borrador.confirmar!(id)
      when "cancelar" then borrador.cancelar!(id)
      else conversar("Quiero corregir algo del resumen.")
      end
    end

    # "si" escrito vale como el boton solo si hay un borrador pendiente.
    def confirmacion_escrita?(texto)
      CONFIRMACIONES_ESCRITAS.include?(texto.downcase.delete(".!¡ ")) && Borrador.pendiente(@conversacion).present?
    end

    def confirmar_por_texto
      Borrador.new(@conversacion, @usuario, @respondedor).confirmar!(Borrador.pendiente(@conversacion)["id"])
    end

    # La nota de voz se transcribe y le llega al modelo marcada, para que la
    # muestre en el resumen ("Entendí: ..."): una transcripcion mala es la causa
    # numero uno de gastos con el valor equivocado.
    def conversar_por_voz
      unless Voz::Transcriptor.configurado? && @mensaje.media_file.present?
        return @respondedor.texto(SIN_VOZ_TODAVIA)
      end

      texto = Voz::Transcriptor.new.transcribir(@mensaje.media_file.read.to_s.b, mime: @mensaje.media_mime,
                                                                                terminos: terminos_de_voz)
      @mensaje.update!(body: texto, payload: @mensaje.payload.merge("transcripcion" => texto))
      conversar("#{PREFIJO_VOZ} #{texto}")
    rescue Voz::Transcriptor::Error => e
      Rails.logger.warn("[agente] nota de voz #{@mensaje.wamid}: #{e.message}")
      @respondedor.texto(VOZ_ILEGIBLE)
    end

    PREFIJO_VOZ = "[Nota de voz transcrita]".freeze
    VOZ_ILEGIBLE = "No pude entender la nota de voz. ¿Me lo escribes, o me mandas la foto del comprobante?".freeze

    # Los codigos de los centros donde la persona registro algo hace poco: son
    # los que va a dictar, y el transcriptor los escribe tal cual si los conoce.
    def terminos_de_voz
      recientes = ReportExpense.where(user_invoice_id: @usuario.id).where("created_at > ?", 120.days.ago)
                               .select(:cost_center_id)
      CostCenter.where(id: recientes).order(updated_at: :desc).limit(Voz::Transcriptor::MAX_TERMINOS).pluck(:code)
    end

    # --- Con el modelo -------------------------------------------------------

    def conversar(texto_forzado = nil)
      herramientas = Herramientas.definiciones(@permisos)
      version = Prompt.version(herramientas)
      renovar_si_cambio_la_version(version)

      mensajes = @conversacion.messages + [{ "role" => "user", "content" => contenido_del_usuario(texto_forzado) }]
      ejecutor = Herramientas.new(usuario: @usuario, mensaje: @mensaje, conversacion: @conversacion,
                                  respondedor: @respondedor, permisos: @permisos)
      resultado = ciclo(mensajes, herramientas, ejecutor)

      case resultado[:fin]
      when :respuesta
        guardar(mensajes, version)
        texto = Formato.para_whatsapp(resultado[:texto])
        @respondedor.texto(texto) if texto.present?
      when :terminal
        guardar(mensajes, version)
      when :rechazo
        @conversacion.cerrar!("rechazo")
        @respondedor.texto(RECHAZO)
      when :tope
        Rails.logger.warn("[agente] turno cortado por tope en la conversacion #{@conversacion.id}")
        @conversacion.cerrar!("tope")
        @respondedor.texto(NO_TERMINE)
      end
    rescue Claude::Client::Error => e
      raise if e.transitorio?

      Rails.logger.error("[agente] Claude rechazo el pedido: #{e.status} #{e.tipo}: #{e.message}")
      @conversacion.cerrar!("error")
      @respondedor.texto(FALLO)
    end

    def ciclo(mensajes, herramientas, ejecutor)
      llamadas = 0
      MAX_PASOS.times do |paso|
        @respondedor.marcar_leido(@mensaje.wamid) if paso.positive? # renueva el "escribiendo..."
        respuesta = @claude.mensajes(cuerpo(mensajes, herramientas), betas: BETAS)
        sumar_uso(respuesta["usage"])
        return { fin: :rechazo } if respuesta["stop_reason"] == "refusal"

        contenido = Array(respuesta["content"])
        mensajes << { "role" => "assistant", "content" => contenido }
        usos = contenido.select { |bloque| bloque["type"] == "tool_use" }
        return { fin: :respuesta, texto: texto_de(contenido) } if usos.empty?

        llamadas += usos.size
        return { fin: :tope } if llamadas > MAX_LLAMADAS_A_TOOLS

        terminal = false
        resultados = usos.map do |uso|
          r = ejecutor.ejecutar(uso["name"], uso["input"])
          terminal ||= r.terminal
          { "type" => "tool_result", "tool_use_id" => uso["id"], "content" => r.contenido.to_s,
            "is_error" => r.error ? true : false }
        end
        # TODOS los resultados en UN mensaje: repartirlos le ensena al modelo a
        # dejar de pedir tools en paralelo.
        mensajes << { "role" => "user", "content" => resultados }
        return { fin: :terminal } if terminal
      end
      { fin: :tope }
    end

    def cuerpo(mensajes, herramientas)
      {
        model: Agente.modelo,
        max_tokens: 16_000,
        system: [{ type: "text", text: Prompt.texto, cache_control: { type: "ephemeral" } }],
        tools: herramientas,
        messages: Historial.expandir(mensajes),
        thinking: { type: "adaptive", block_binding: { prefix_mismatch_behavior: "drop_block" } },
        output_config: { effort: Agente.effort },
        # Cachea el historial completo: cada turno relee lo anterior a 1/20 del
        # precio en vez de pagarlo entero.
        cache_control: { type: "ephemeral" }
      }
    end

    def contenido_del_usuario(texto_forzado)
      bloques = []
      bloques << { "type" => "text", "text" => contexto_inicial } if @conversacion.messages.empty?
      bloques << Historial.referencia(@mensaje) if @mensaje.imagen_o_pdf?
      texto = texto_forzado || @mensaje.body.presence
      texto ||= "[La persona mandó este archivo sin texto]" if @mensaje.imagen_o_pdf?
      bloques << { "type" => "text", "text" => texto.to_s } if texto.present?
      bloques
    end

    # Va en el PRIMER mensaje de cada conversacion y no en el prompt de sistema:
    # asi el sistema es identico para todos y el cache se comparte.
    def contexto_inicial
      ahora = Time.current.in_time_zone("America/Bogota")
      lineas = ["[Contexto] Te escribe #{nombre_del_usuario}. Hoy es #{fecha_larga(ahora)} " \
                "(#{ahora.strftime('%Y-%m-%d')}), hora de Colombia #{ahora.strftime('%H:%M')}."]
      lineas << @permisos.descripcion
      previo = ultimo_registro
      lineas << "Lo último que registró por aquí: #{previo}." if previo
      contacto = ENV["WHATSAPP_CONTACTO_HUMANO"].presence
      lineas << "Si la persona necesita hablar con alguien, el contacto es: #{contacto}." if contacto
      lineas.join(" ")
    end

    DIAS = %w[domingo lunes martes miércoles jueves viernes sábado].freeze
    MESES = %w[enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre].freeze

    # A mano y no con I18n.l: el dia de la semana es lo que deja resolver
    # "el lunes" o "ayer" sin adivinar, y no depende de las traducciones cargadas.
    def fecha_larga(momento)
      "#{DIAS[momento.wday]} #{momento.day} de #{MESES[momento.month - 1]} de #{momento.year}"
    end

    def nombre_del_usuario
      [@usuario.names, @usuario.last_names].map(&:to_s).map(&:strip).reject(&:empty?).join(" ").presence ||
        @usuario.email
    end

    def ultimo_registro
      anterior = WhatsappConversation.where(user: @usuario, closed_reason: "registro")
                                     .where("closed_at > ?", WhatsappConversation::INACTIVIDAD.ago)
                                     .order(:closed_at).last
      anterior&.estado&.dig("ultimo_registro")
    end

    def renovar_si_cambio_la_version(version)
      return if @conversacion.prompt_version.blank? || @conversacion.prompt_version == version

      @conversacion.cerrar!("nueva_version")
      @conversacion = WhatsappConversation.create!(user: @usuario, wa_id: @conversacion.wa_id,
                                                   bsuid: @conversacion.bsuid, last_inbound_at: Time.current)
      @mensaje.update!(whatsapp_conversation: @conversacion)
    end

    def guardar(mensajes, version)
      @conversacion.reload
      return unless @conversacion.abierta? # un boton pudo cerrarla mientras tanto

      @conversacion.update!(messages: mensajes, prompt_version: version)
    end

    def sumar_uso(uso)
      return unless uso.is_a?(Hash)

      @conversacion.input_tokens += uso["input_tokens"].to_i + uso["cache_creation_input_tokens"].to_i
      @conversacion.output_tokens += uso["output_tokens"].to_i
      @conversacion.cache_read_tokens += uso["cache_read_input_tokens"].to_i
      @conversacion.save!
    end

    def texto_de(contenido)
      contenido.select { |bloque| bloque["type"] == "text" }.map { |bloque| bloque["text"] }.join("\n").strip
    end
  end
end

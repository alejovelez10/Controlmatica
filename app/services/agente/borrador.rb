module Agente
  # El registro que el agente propone y que SOLO el boton Confirmar guarda
  # (paquete 17).
  #
  # En Taimes el modelo llamaba report_expenses_create despues de un "si". Aqui
  # el modelo no tiene esa tool: propone, el codigo guarda el borrador en la
  # conversacion (`estado["borrador"]`) y manda el resumen con tres botones. El
  # id del borrador es tambien la llave de idempotencia: si el worker se
  # reinicia a mitad de la creacion, el reintento ve "creado" y no duplica.
  class Borrador
    BOTON_CONFIRMAR = "Confirmar".freeze
    BOTON_CORREGIR = "Corregir".freeze
    BOTON_CANCELAR = "Cancelar".freeze

    CAMPOS_GASTO = %w[cost_center_id type_identification_id payment_type_id invoice_name identification
                      invoice_number invoice_date invoice_value invoice_tax invoice_total currency
                      foreign_value foreign_tax foreign_total exchange_rate exchange_rate_date description].freeze

    CAMPOS_REPORTE = %w[cost_center_id contact_id report_date working_time displacement_hours viatic_value
                        viatic_description work_description].freeze

    FECHA = /\A\d{4}-\d{2}-\d{2}\z/.freeze

    def initialize(conversacion, usuario, respondedor)
      @conversacion = conversacion
      @usuario = usuario
      @respondedor = respondedor
    end

    def self.pendiente(conversacion)
      borrador = conversacion.estado["borrador"]
      borrador if borrador.is_a?(Hash) && borrador["estado"] == "pendiente"
    end

    # --- Proponer (los llama el modelo como tools) ---------------------------

    def proponer_gasto(args, mensaje)
      datos = args.slice(*CAMPOS_GASTO).compact
      error = error_de_gasto(datos)
      return rechazo(error) if error

      veredicto = veredicto_de(args["hallazgos_politica"])
      reglas = juzgar_gasto(datos, veredicto)
      if reglas[:bloqueantes].any?
        return rechazo("NO se puede registrar así (regla obligatoria). Explícale a la persona, con " \
                       "estas palabras: #{reglas[:bloqueantes].join(' | ')}")
      end

      archivo = @conversacion.whatsapp_messages.entrantes.order(:created_at).select(&:imagen_o_pdf?).last
      archivo ||= mensaje if mensaje&.imagen_o_pdf?
      guardar_y_enviar("gasto", datos, args["resumen"], reglas[:avisos],
                       veredicto: veredicto, archivo_id: archivo&.id)
    end

    def proponer_reporte(args)
      datos = args.slice(*CAMPOS_REPORTE).compact
      error = error_de_reporte(datos)
      return rechazo(error) if error

      guardar_y_enviar("reporte", datos, args["resumen"], [])
    end

    # --- Lo que la persona toca ----------------------------------------------

    # => texto que se le mando a la persona
    def confirmar!(id)
      borrador = @conversacion.estado["borrador"]
      return responder("Ese resumen ya no está vigente. Si quieres, empecemos de nuevo.") unless vigente?(borrador, id)
      return responder(borrador["mensaje_final"]) if borrador["estado"] == "creado"

      if vencido?(borrador)
        actualizar(borrador.merge("estado" => "vencido"))
        return responder("Ese resumen venció (pasaron más de 15 minutos) y no guardé nada. " \
                         "Envíame de nuevo el comprobante o los datos y lo armamos otra vez.")
      end

      borrador["tipo"] == "reporte" ? crear_reporte!(borrador) : crear_gasto!(borrador)
    end

    def cancelar!(id)
      borrador = @conversacion.estado["borrador"]
      return responder("No había nada pendiente por registrar.") unless vigente?(borrador, id)

      actualizar(borrador.merge("estado" => "cancelado"))
      @conversacion.cerrar!("cancelado")
      responder("Listo, no guardé nada.")
    end

    private

    # --- Gasto ---------------------------------------------------------------

    def error_de_gasto(datos)
      return "Falta el centro de costo." if datos["cost_center_id"].blank?
      return "Falta el tipo de gasto (de report_expense_options_list)." if datos["type_identification_id"].blank?
      return "La fecha va en formato YYYY-MM-DD." unless datos["invoice_date"].to_s.match?(FECHA)
      return "Falta el total." if datos["invoice_total"].blank?
      return "Moneda inválida: usa una de #{Currency::CODES.join(', ')}." unless Currency.valid?(datos["currency"])
      return "Ningún valor puede ser negativo." if %w[invoice_value invoice_tax invoice_total].any? { |c| datos[c].to_f.negative? }

      nil
    end

    # El mismo candidato que arma expense_rules_validate, mas el veredicto del
    # agente, para que lo que frena se sepa ANTES de mostrar los botones.
    def juzgar_gasto(datos, veredicto)
      campos = ExpenseRulesValidateTool::CANDIDATE_FIELDS.map(&:to_s)
      candidato = ReportExpense.new(datos.slice(*campos).merge("user_invoice_id" => @usuario.id))
      candidato.valid?
      resultado = ExpenseRuleService.validate(candidato, user: @usuario, agent_verdict: veredicto).value
      bloqueantes = resultado[:blocking_violations].map { |v| v[:message] }
      avisos = resultado[:violations].map { |v| v[:message] } - bloqueantes
      avisos << aviso_de_presupuesto(candidato)
      { bloqueantes: bloqueantes, avisos: avisos.compact }
    end

    def aviso_de_presupuesto(candidato)
      datos = ExpenseBudgetService.available_for(cost_center_id: candidato.cost_center_id, user_id: @usuario.id)
      exceso = candidato.invoice_value.to_d - datos[:available].to_d
      return nil unless datos[:has_budget] && exceso.positive?

      "Este gasto supera tu disponible en #{ExpenseBudgetService.money(exceso)}. Se puede registrar, " \
      "pero quedará marcado como excedido."
    rescue StandardError
      nil
    end

    def veredicto_de(hallazgos)
      lista = Array(hallazgos).filter_map do |h|
        h = h.to_h.with_indifferent_access
        motivo = h[:motivo].to_s.strip
        { rule_id: h[:rule_id], message: motivo } if motivo.present?
      end
      { compliant: lista.empty?, findings: lista }
    end

    def crear_gasto!(borrador)
      argumentos = borrador["args"].dup
      veredicto = borrador["veredicto"] || {}
      unless veredicto["compliant"].nil?
        argumentos["policy_compliant"] = veredicto["compliant"]
        argumentos["policy_findings"] = Array(veredicto["findings"]).map { |f| { "rule_id" => f["rule_id"], "reason" => f["message"] } }
      end

      creado = McpEnProceso.llamar_json("report_expenses_create", argumentos, usuario: @usuario,
                                                                               wa_id: @conversacion.wa_id)
      gasto = creado[:datos]
      return fallo!(borrador, mensaje_de_error(creado)) if creado[:error] || !gasto.is_a?(Hash) || gasto["id"].blank?

      lineas = ["✅ Listo, quedó registrado el gasto *##{gasto['id']}*."]
      lineas << gasto["budget_message"] if gasto["budget_message"].present?
      sin_aprobar = Array(gasto["rule_violations"]).filter_map { |v| v.is_a?(Hash) ? v["message"] : v.to_s }
      lineas << "Quedó sin aprobar porque: #{sin_aprobar.join(' ')}" if sin_aprobar.any?
      lineas << adjuntar_comprobante(gasto["id"], borrador["archivo_id"])
      terminar!(borrador, gasto["id"], lineas.compact.join("\n\n"),
                "gasto ##{gasto['id']} por #{gasto['invoice_total']} (#{gasto['invoice_name']})")
    end

    def adjuntar_comprobante(gasto_id, archivo_id)
      archivo = archivo_id && WhatsappMessage.find_by(id: archivo_id)
      return "Quedó sin comprobante; si tienes la foto, envíamela y la adjunto." unless archivo&.media_file.present?

      resultado = Adjunto.adjuntar(gasto_id, archivo, usuario: @usuario)
      return "📎 Comprobante adjunto." unless resultado[:error]

      "No pude adjuntar el comprobante (#{resultado[:texto].to_s.delete_prefix('Error: ')}). Envíamelo de nuevo y lo adjunto."
    end

    # --- Reporte -------------------------------------------------------------

    def error_de_reporte(datos)
      return "Falta el centro de costo." if datos["cost_center_id"].blank?
      return "Falta el contacto (de contacts_list del cliente del centro)." if datos["contact_id"].blank?
      return "La fecha va en formato YYYY-MM-DD." unless datos["report_date"].to_s.match?(FECHA)
      return "Ninguna hora ni valor puede ser negativo." if %w[working_time displacement_hours viatic_value].any? { |c| datos[c].to_f.negative? }
      return "Falta qué trabajo se hizo." if datos["work_description"].blank?

      nil
    end

    def crear_reporte!(borrador)
      creado = McpEnProceso.llamar_json("reports_create", borrador["args"], usuario: @usuario,
                                                                            wa_id: @conversacion.wa_id)
      reporte = creado[:datos]
      return fallo!(borrador, mensaje_de_error(creado)) if creado[:error] || !reporte.is_a?(Hash) || reporte["id"].blank?

      codigo = reporte["code_report"].presence || "##{reporte['id']}"
      lineas = ["✅ Listo, quedó registrado el reporte *#{codigo}*."]
      lineas << "Valor: #{ExpenseBudgetService.money(reporte['total_value'].to_d)}" if reporte["total_value"].present?
      terminar!(borrador, reporte["id"], lineas.join("\n"), "reporte #{codigo}")
    end

    # --- Comun ---------------------------------------------------------------

    def guardar_y_enviar(tipo, datos, resumen, avisos, veredicto: nil, archivo_id: nil)
      texto = Formato.para_whatsapp(resumen)
      texto = [texto, *avisos.map { |a| "⚠️ #{a}" }].join("\n\n") if avisos.any?
      borrador = { "id" => SecureRandom.hex(6), "tipo" => tipo, "args" => datos, "veredicto" => veredicto,
                   "archivo_id" => archivo_id, "creado_en" => Time.current.iso8601, "estado" => "pendiente" }
      actualizar(borrador)
      @respondedor.botones(texto, [{ id: "borrador:confirmar:#{borrador['id']}", titulo: BOTON_CONFIRMAR },
                                   { id: "borrador:corregir:#{borrador['id']}", titulo: BOTON_CORREGIR },
                                   { id: "borrador:cancelar:#{borrador['id']}", titulo: BOTON_CANCELAR }])
      Herramientas::Resultado.new(
        contenido: "Resumen enviado con los botones Confirmar / Corregir / Cancelar. No escribas nada más: " \
                   "solo el botón Confirmar guarda, y el sistema le avisará a la persona.",
        error: false, terminal: true
      )
    end

    def rechazo(motivo)
      Herramientas::Resultado.new(contenido: motivo, error: true, terminal: false)
    end

    def vigente?(borrador, id)
      borrador.is_a?(Hash) && borrador["id"] == id && %w[pendiente creado].include?(borrador["estado"])
    end

    def vencido?(borrador)
      Time.zone.parse(borrador["creado_en"].to_s) < VIGENCIA_BORRADOR.ago
    rescue ArgumentError, TypeError
      true
    end

    def fallo!(borrador, motivo)
      actualizar(borrador.merge("estado" => "fallido"))
      anotar("[Sistema] La persona tocó Confirmar pero el registro NO se guardó: #{motivo}. " \
             "Ayúdale a corregirlo y vuelve a proponerlo.")
      responder("No pude registrarlo: #{motivo}\n\nSi quieres, lo corregimos y lo intento de nuevo.")
    end

    def terminar!(borrador, registro_id, mensaje, resumen_corto)
      actualizar(borrador.merge("estado" => "creado", "registro_id" => registro_id, "mensaje_final" => mensaje))
      @conversacion.update!(estado: @conversacion.estado.merge("ultimo_registro" => resumen_corto))
      # Corte del hilo tras cada registro (leccion de Taimes: un hilo de 20 dias
      # llego a 125.691 tokens en un turno). La siguiente conversacion arranca
      # con `ultimo_registro` como contexto.
      @conversacion.cerrar!("registro")
      responder(mensaje)
    end

    def mensaje_de_error(creado)
      datos = creado[:datos]
      mensaje = datos["message"] if datos.is_a?(Hash)
      mensaje = Array(mensaje).join(" ").presence || creado[:texto].to_s.delete_prefix("Error: ")
      mensaje.to_s.truncate(600)
    end

    def actualizar(borrador)
      @conversacion.update!(estado: @conversacion.estado.merge("borrador" => borrador))
    end

    # Nota del sistema en el historial, para que el modelo sepa lo que paso
    # fuera de el. Se AGREGA al final: el historial nunca se edita.
    def anotar(texto)
      @conversacion.update!(messages: @conversacion.messages + [{ "role" => "user", "content" => texto }])
    end

    def responder(texto)
      @respondedor.texto(texto)
      texto
    end
  end
end

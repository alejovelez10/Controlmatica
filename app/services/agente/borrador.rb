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
                        viatic_description work_description customer_id cost_center_owner_id].freeze
    # Solo cuando el servicio no tiene centro y se crea uno (como en la web).
    CAMPOS_SIN_CENTRO = %w[customer_id cost_center_owner_id].freeze

    FECHA = /\A\d{4}-\d{2}-\d{2}\z/.freeze

    def initialize(conversacion, usuario, respondedor)
      @conversacion = conversacion
      @usuario = usuario
      @respondedor = respondedor
      @permisos = Permisos.para(usuario)
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

      archivo = @conversacion.whatsapp_messages.entrantes.order(:created_at).select(&:imagen_o_pdf?).last
      archivo ||= mensaje if mensaje&.imagen_o_pdf?
      veredicto = veredicto_de(args["hallazgos_politica"])
      lectura = lectura_para_cotejo(datos, archivo)
      reglas = juzgar_gasto(datos, veredicto, lectura)
      if reglas[:bloqueantes].any?
        return rechazo("NO se puede registrar así (regla obligatoria). Explícale a la persona, con " \
                       "estas palabras: #{reglas[:bloqueantes].join(' | ')}")
      end

      guardar_y_enviar("gasto", datos, args["resumen"], reglas[:avisos],
                       veredicto: veredicto, archivo_id: archivo&.id, lectura: lectura)
    end

    def proponer_reporte(args)
      datos = args.slice(*CAMPOS_REPORTE).compact
      # Con centro, el cliente sale del centro y no hay centro nuevo que crear.
      datos = datos.except(*CAMPOS_SIN_CENTRO) if datos["cost_center_id"].present?
      error = error_de_reporte(datos)
      return rechazo(error) if error
      if viaticos_sin_permiso?(datos)
        return rechazo("Esta persona no registra viáticos en los reportes (igual que en el sistema). Propón " \
                       "con viatic_value 0 y sin viatic_description, y dile que los viáticos los carga " \
                       "quien tiene ese permiso.")
      end

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

      return sin_permiso!(borrador) unless permitido?(borrador)

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
    # agente y la lectura del comprobante, para que lo que frena —y lo que no
    # cuadra con el comprobante— se sepa ANTES de mostrar los botones.
    def juzgar_gasto(datos, veredicto, lectura = nil)
      campos = ExpenseRulesValidateTool::CANDIDATE_FIELDS.map(&:to_s)
      candidato = ReportExpense.new(datos.slice(*campos).merge("user_invoice_id" => @usuario.id))
      candidato.lectura_del_comprobante = lectura
      candidato.valid?
      resultado = ExpenseRuleService.validate(candidato, user: @usuario, agent_verdict: veredicto).value
      bloqueantes = resultado[:blocking_violations].map { |v| v[:message] }
      avisos = resultado[:violations].map { |v| v[:message] } - bloqueantes
      if resultado[:violations].any? { |v| v[:code] == ExpenseRuleService::CODE_RECEIPT }
        avisos << "Si lo confirmas así, el gasto quedará pendiente de aprobación por no cuadrar con el " \
                  "comprobante. Si es un error, toca Corregir."
      end
      avisos << aviso_de_presupuesto(candidato)
      { bloqueantes: bloqueantes, avisos: avisos.compact }
    end

    # COTEJO DEL COMPROBANTE (2026-10-25). Si una regla de la persona pide
    # cotejarlo, la IA lee aqui el archivo de la conversacion y el resumen ya
    # dice lo que no cuadra, cuando todavia se puede tocar Corregir. La lectura
    # se guarda en el borrador y viaja al crear (`crear_gasto!`): el gasto la
    # compara con lo que se confirme.
    #
    # Una correccion sobre el MISMO archivo no lo vuelve a leer: se reusa la
    # lectura del borrador anterior si salio bien (una que fallo por un timeout
    # se intenta otra vez). nil si a este gasto no se le coteja nada.
    def lectura_para_cotejo(datos, archivo)
      candidato = ReportExpense.new(type_identification_id: datos["type_identification_id"],
                                    user_invoice_id: @usuario.id)
      reglas = ExpenseRule.para_gasto(@usuario, datos["type_identification_id"])
      return nil unless CotejoDelComprobante.aplica?(candidato, reglas)
      return CotejoDelComprobante.sin_comprobante if archivo.nil?

      previo = @conversacion.estado["borrador"]
      previa = previo.is_a?(Hash) && previo["archivo_id"] == archivo.id ? previo["lectura"] : nil
      return previa if previa.is_a?(Hash) && previa["estado"] == CotejoDelComprobante::LEIDO

      CotejoDelComprobante.leer(
        { data: archivo.media_file.read.to_s.b, media_type: archivo.media_mime,
          filename: archivo.media_filename.presence || "comprobante" },
        cost_center_code: CostCenter.find_by(id: datos["cost_center_id"])&.code,
        tipo_de_gasto: ReportExpenseOption.find_by(id: datos["type_identification_id"])&.name
      )
    rescue StandardError => e
      Rails.logger.error("[agente] lectura para el cotejo: #{e.class}: #{e.message}")
      { "estado" => CotejoDelComprobante::SIN_LECTURA, "motivo" => "provider_error" }
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

      # La lectura del comprobante va por el contexto y no como argumento: ver
      # ReportExpensesCreateTool.
      contexto = borrador["lectura"].present? ? { lectura_del_comprobante: borrador["lectura"] } : {}
      creado = McpEnProceso.llamar_json("report_expenses_create", argumentos, usuario: @usuario,
                                                                               wa_id: @conversacion.wa_id,
                                                                               contexto: contexto)
      gasto = creado[:datos]
      return fallo!(borrador, mensaje_de_error(creado)) if creado[:error] || !gasto.is_a?(Hash) || gasto["id"].blank?

      lineas = ["✅ Listo, quedó registrado el gasto *##{gasto['id']}*."]
      lineas << gasto["budget_message"] if gasto["budget_message"].present?
      sin_aprobar = Array(gasto["rule_violations"]).filter_map { |v| v.is_a?(Hash) ? v["message"] : v.to_s }
      lineas << "Quedó sin aprobar porque: #{sin_aprobar.join(' ')}" if sin_aprobar.any?
      lineas << adjuntar_comprobante(gasto["id"], borrador["archivo_id"], contexto)
      terminar!(borrador, gasto["id"], lineas.compact.join("\n\n"),
                "gasto ##{gasto['id']} por #{gasto['invoice_total']} (#{gasto['invoice_name']})")
    end

    def adjuntar_comprobante(gasto_id, archivo_id, contexto = {})
      archivo = archivo_id && WhatsappMessage.find_by(id: archivo_id)
      return "Quedó sin comprobante; si tienes la foto, envíamela y la adjunto." unless archivo&.media_file.present?

      resultado = Adjunto.adjuntar(gasto_id, archivo, usuario: @usuario, contexto: contexto)
      return "📎 Comprobante adjunto." unless resultado[:error]

      "No pude adjuntar el comprobante (#{resultado[:texto].to_s.delete_prefix('Error: ')}). Envíamelo de nuevo y lo adjunto."
    end

    # --- Reporte -------------------------------------------------------------

    def error_de_reporte(datos)
      if datos["cost_center_id"].blank?
        error = error_sin_centro(datos)
        return error if error
      end
      return "Falta el contacto (de contacts_list del cliente del centro)." if datos["contact_id"].blank?
      return "La fecha va en formato YYYY-MM-DD." unless datos["report_date"].to_s.match?(FECHA)
      return "Ninguna hora ni valor puede ser negativo." if %w[working_time displacement_hours viatic_value].any? { |c| datos[c].to_f.negative? }
      return "Falta qué trabajo se hizo." if datos["work_description"].blank?

      nil
    end

    # Sin centro se crea uno: hacen falta el cliente y su propietario, con las
    # mismas reglas del formulario web (Report#propietario_del_centro_nuevo).
    def error_sin_centro(datos)
      if datos["customer_id"].blank?
        return "Sin centro de costo se crea uno nuevo y falta el cliente (de records_search entity customers)."
      end
      unless Customer.exists?(datos["customer_id"])
        return "Ese cliente no existe: búscalo con records_search entity customers."
      end
      if datos["cost_center_owner_id"].blank?
        return "Sin centro de costo se crea uno nuevo y falta su propietario: pregúntalo con propietarios_list."
      end
      unless User.pueden_ser_propietarios.where(id: datos["cost_center_owner_id"]).exists?
        return "Esa persona no puede ser propietaria de un centro: elige una de propietarios_list."
      end
      if datos["contact_id"].present? && !Contact.exists?(id: datos["contact_id"], customer_id: datos["customer_id"])
        return "Ese contacto no es del cliente elegido: usa contacts_list con su customer_id."
      end

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
      centro_nuevo = centro_creado(borrador, reporte)
      lineas << centro_nuevo if centro_nuevo
      terminar!(borrador, reporte["id"], lineas.join("\n"), "reporte #{codigo}")
    end

    # --- Permisos ------------------------------------------------------------

    # Se mira otra vez al confirmar, no solo al proponer: le pueden quitar el
    # permiso al rol mientras el resumen espera el boton.
    def permitido?(borrador)
      if borrador["tipo"] == "reporte"
        @permisos.registrar_reporte? && !viaticos_sin_permiso?(borrador["args"] || {})
      else
        @permisos.registrar_gasto?
      end
    end

    def viaticos_sin_permiso?(datos)
      datos["viatic_value"].to_f.positive? && !@permisos.ingresar_viaticos?
    end

    def sin_permiso!(borrador)
      actualizar(borrador.merge("estado" => "cancelado"))
      que = borrador["tipo"] == "reporte" ? "reportes de servicio" : "gastos"
      responder("Tu rol no tiene habilitado registrar #{que} por aquí, así que no guardé nada. " \
                "Si lo necesitas, pídeselo al administrador.")
    end

    def centro_creado(borrador, reporte)
      return nil if borrador.dig("args", "cost_center_id").present?

      centro = CostCenter.find_by(id: reporte["cost_center_id"])
      return nil unless centro

      propietario = User.find_by(id: centro.user_owner_id)&.names
      "Se creó el centro de costo *#{centro.code}*#{" con #{propietario} como propietario" if propietario}."
    end

    # --- Comun ---------------------------------------------------------------

    def guardar_y_enviar(tipo, datos, resumen, avisos, veredicto: nil, archivo_id: nil, lectura: nil)
      texto = Formato.para_whatsapp(resumen)
      # Los avisos que el modelo ya puso en su resumen no se repiten (visto en
      # la prueba real del 2026-10-19: el del tope salia dos veces).
      faltantes = avisos.reject { |aviso| texto.include?(aviso.to_s.delete_suffix(".")) }
      texto = [texto, *faltantes.map { |a| "⚠️ #{a}" }].join("\n\n") if faltantes.any?
      borrador = { "id" => SecureRandom.hex(6), "tipo" => tipo, "args" => datos, "veredicto" => veredicto,
                   "archivo_id" => archivo_id, "lectura" => lectura, "creado_en" => Time.current.iso8601,
                   "estado" => "pendiente" }
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

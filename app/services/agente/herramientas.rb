module Agente
  # Las herramientas del agente (paquete 17): una lista cerrada de tools del MCP
  # de Controlmatica, llamadas EN PROCESO, mas cuatro propias del canal.
  #
  # Las del MCP pasan por MCP::Server#handle y no se invocan a mano: asi se
  # conservan la validacion de argumentos contra el esquema, la identificacion
  # estricta del actor (server_context con su telefono y su correo),
  # User.current en las escrituras, las reglas y el presupuesto. Crear lo hace
  # el boton Confirmar (Agente::Borrador), no el modelo.
  #
  # EL AGENTE SOLO REGISTRA, NO CONSULTA (decision del 2026-10-20): aqui estan
  # unicamente las busquedas que la creacion necesita, cada persona ve solo las
  # de lo que su rol le permite registrar (Agente::Permisos), y de cada
  # respuesta el modelo recibe solo los CAMPOS que la creacion usa. Que el
  # prompt diga "no respondas consultas" no es una barrera; esto si.
  class Herramientas
    # Encontrar el centro de costo, por codigo, por nombre o por el cliente.
    PARA_EL_CENTRO = [CostCentersListTool, RecordsSearchTool].freeze
    # Tipos y medios de pago, las reglas de la persona, validarlas y la tasa.
    PARA_GASTOS = [ReportExpenseOptionsListTool, ExpenseRulesListTool, ExpenseRulesValidateTool,
                   ExchangeRatesGetTool].freeze
    # La tarifa hora del centro y los contactos del cliente.
    PARA_REPORTES = [CostCentersGetTool, ContactsListTool].freeze
    DEL_MCP = (PARA_EL_CENTRO + PARA_GASTOS + PARA_REPORTES).freeze

    # records_search solo para encontrar el centro: por su nombre o por el
    # nombre del cliente.
    ENTIDADES_DE_BUSQUEDA = %w[cost_centers customers].freeze

    # Lo unico que el modelo recibe de cada respuesta. Lo demas (valor
    # cotizado, estados de facturacion y ventas, gastos del centro, NIT y
    # telefonos de clientes y contactos) no lo necesita para registrar.
    CAMPOS_DEL_CENTRO = %w[id code description service_type execution_state customer_id customer_name].freeze
    CAMPOS = {
      "cost_centers_list" => CAMPOS_DEL_CENTRO,
      "cost_centers_get" => CAMPOS_DEL_CENTRO + %w[hour_real],
      "records_search:cost_centers" => CAMPOS_DEL_CENTRO,
      "records_search:customers" => %w[id name code],
      "contacts_list" => %w[id name position customer_id]
    }.freeze

    # Terminan el turno: mandan su propio mensaje a la persona y despues no se
    # vuelve a llamar al modelo.
    TERMINALES = %w[ofrecer_opciones proponer_gasto proponer_reporte].freeze

    PROPIAS = [
      {
        name: "ofrecer_opciones",
        description: "Envía tu mensaje a la persona con opciones para tocar: 2 o 3 opciones se " \
                     "muestran como botones; de 4 a 10, como lista. Úsala para preguntas cerradas " \
                     "(¿gasto o reporte?, medio de pago, elegir entre pocos centros de costo o " \
                     "contactos). Lo que la persona toque te llega como su siguiente mensaje. El " \
                     "texto que pasas ES tu mensaje: después de llamarla no escribas nada más.",
        input_schema: {
          type: "object", additionalProperties: false,
          properties: {
            texto: { type: "string", description: "El mensaje completo: contexto y pregunta" },
            opciones: { type: "array", items: { type: "string" },
                        description: "De 2 a 10 opciones, cortas (máximo 20 caracteres con 2-3; 24 con más)" }
          },
          required: %w[texto opciones]
        }
      },
      {
        name: "proponer_gasto",
        description: "Propone el gasto a la persona. El sistema valida las reglas, le muestra tu " \
                     "resumen con los botones Confirmar / Corregir / Cancelar y SOLO el botón " \
                     "Confirmar lo guarda (con el comprobante de la conversación, si hay). Llámala " \
                     "cuando tengas centro de costo, tipo de gasto, medio de pago, fecha, total y " \
                     "moneda decididos y hayas pasado por expense_rules_validate. Después no " \
                     "escribas nada más. Los valores invoice_* van en pesos (COP).",
        input_schema: {
          type: "object", additionalProperties: false,
          properties: {
            cost_center_id: { type: "integer" },
            type_identification_id: { type: "integer", description: "Id del tipo de gasto elegido" },
            payment_type_id: { type: "integer", description: "Id del medio de pago elegido" },
            invoice_name: { type: "string", description: "Proveedor" },
            identification: { type: "string", description: "NIT o cédula de quien emite" },
            invoice_number: { type: "string" },
            invoice_date: { type: "string", description: "YYYY-MM-DD" },
            invoice_value: { type: "number", description: "Base en COP" },
            invoice_tax: { type: "number", description: "Impuestos en COP" },
            invoice_total: { type: "number", description: "Total en COP" },
            currency: { type: "string", description: "ISO 4217: #{Currency::CODES.join(', ')}" },
            foreign_value: { type: "number" },
            foreign_tax: { type: "number" },
            foreign_total: { type: "number" },
            exchange_rate: { type: "number" },
            exchange_rate_date: { type: "string", description: "YYYY-MM-DD" },
            description: { type: "string", description: "Qué se compró, una frase corta" },
            resumen: { type: "string", description: "El resumen para la persona, con el formato de las instrucciones" },
            hallazgos_politica: {
              type: "array",
              description: "Cada incumplimiento de las agent_instructions que VES en el comprobante; vacía si no hay",
              items: {
                type: "object", additionalProperties: false,
                properties: { rule_id: { type: "integer" }, motivo: { type: "string" } },
                required: %w[rule_id motivo]
              }
            }
          },
          required: %w[cost_center_id type_identification_id invoice_date invoice_total currency resumen
                       hallazgos_politica]
        }
      },
      {
        name: "proponer_reporte",
        description: "Propone el reporte de servicio a la persona. El sistema le muestra tu resumen " \
                     "con los botones Confirmar / Corregir / Cancelar y SOLO el botón Confirmar lo " \
                     "guarda. Llámala cuando tengas el centro, el contacto y los seis datos. " \
                     "Después no escribas nada más.",
        input_schema: {
          type: "object", additionalProperties: false,
          properties: {
            cost_center_id: { type: "integer" },
            contact_id: { type: "integer", description: "De contacts_list del cliente del centro" },
            report_date: { type: "string", description: "YYYY-MM-DD" },
            working_time: { type: "number", description: "Horas trabajadas" },
            displacement_hours: { type: "number", description: "Horas de desplazamiento" },
            viatic_value: { type: "number", description: "Viáticos en COP (0 si no hubo)" },
            viatic_description: { type: "string" },
            work_description: { type: "string", description: "Qué trabajo se hizo" },
            resumen: { type: "string" }
          },
          required: %w[cost_center_id contact_id report_date working_time displacement_hours viatic_value
                       work_description resumen]
        }
      },
      {
        name: "adjuntar_comprobante",
        description: "Adjunta la última foto o PDF que la persona mandó en esta conversación a un " \
                     "gasto suyo YA registrado (por ejemplo, uno que registró sin foto). Nunca crees " \
                     "otro gasto para adjuntar una foto.",
        input_schema: {
          type: "object", additionalProperties: false,
          properties: { report_expense_id: { type: "integer", description: "Número del gasto" } },
          required: %w[report_expense_id]
        }
      }
    ].freeze

    Resultado = Struct.new(:contenido, :error, :terminal, keyword_init: true)

    # Las que ve el modelo, segun lo que la persona puede registrar. Una por
    # combinacion de permisos: el prompt cacheado y la VERSION dependen de esto.
    def self.definiciones(permisos)
      clave = [permisos.registrar_gasto?, permisos.registrar_reporte?]
      @definiciones ||= {}
      @definiciones[clave] ||= nombres_permitidos(permisos).then do |nombres|
        (DEL_MCP.map { |tool| definicion_mcp(tool) } + PROPIAS.map(&:deep_stringify_keys))
          .select { |definicion| nombres.include?(definicion["name"]) }.freeze
      end
    end

    def self.nombres_permitidos(permisos)
      tools = []
      tools += PARA_EL_CENTRO if permisos.alguno?
      tools += PARA_GASTOS if permisos.registrar_gasto?
      tools += PARA_REPORTES if permisos.registrar_reporte?
      propias = []
      propias << "ofrecer_opciones" if permisos.alguno?
      propias += %w[proponer_gasto adjuntar_comprobante] if permisos.registrar_gasto?
      propias << "proponer_reporte" if permisos.registrar_reporte?
      tools.map(&:tool_name) + propias
    end

    # El esquema que publica la gema trae "$schema"; Claude no lo necesita.
    def self.definicion_mcp(tool)
      datos = tool.to_h
      { "name" => datos[:name], "description" => datos[:description].to_s,
        "input_schema" => datos[:inputSchema].deep_stringify_keys.except("$schema") }
    end

    def initialize(usuario:, mensaje:, conversacion:, respondedor:, permisos: Permisos.para(usuario))
      @usuario = usuario
      @mensaje = mensaje
      @conversacion = conversacion
      @respondedor = respondedor
      @permisos = permisos
    end

    # => Resultado(contenido: String, error: Boolean, terminal: Boolean)
    def ejecutar(nombre, argumentos)
      argumentos = (argumentos || {}).deep_stringify_keys
      # Se vuelve a mirar aqui y no solo en la lista que ve el modelo: un
      # nombre inventado, o una conversacion que empezo antes de que le
      # quitaran el permiso, no pasan.
      unless self.class.nombres_permitidos(@permisos).include?(nombre)
        return Resultado.new(contenido: "La herramienta #{nombre} no está disponible para esta persona.",
                             error: true, terminal: false)
      end

      case nombre
      when "ofrecer_opciones" then ofrecer_opciones(argumentos)
      when "proponer_gasto" then Borrador.new(@conversacion, @usuario, @respondedor).proponer_gasto(argumentos, @mensaje)
      when "proponer_reporte" then Borrador.new(@conversacion, @usuario, @respondedor).proponer_reporte(argumentos)
      when "adjuntar_comprobante" then adjuntar_comprobante(argumentos)
      else del_mcp(nombre, argumentos)
      end
    rescue StandardError => e
      Rails.logger.error("[agente] tool #{nombre}: #{e.class}: #{e.message}")
      Resultado.new(contenido: "Error interno al ejecutar #{nombre}. Intenta otra vía o dile a la persona " \
                               "que lo intente más tarde.", error: true, terminal: false)
    end

    def self.del_mcp?(nombre)
      DEL_MCP.any? { |tool| tool.tool_name == nombre }
    end

    def del_mcp(nombre, argumentos)
      unless self.class.del_mcp?(nombre)
        return Resultado.new(contenido: "No existe la herramienta #{nombre}.", error: true, terminal: false)
      end
      if nombre == "records_search" && !ENTIDADES_DE_BUSQUEDA.include?(argumentos["entity"].to_s)
        return Resultado.new(contenido: "Aquí solo se busca para encontrar el centro de costo: entity " \
                                        "\"cost_centers\" o \"customers\". El agente no responde consultas.",
                             error: true, terminal: false)
      end

      respuesta = McpEnProceso.llamar(nombre, argumentos, usuario: @usuario, wa_id: @mensaje.wa_id)
      clave = nombre == "records_search" ? "#{nombre}:#{argumentos['entity']}" : nombre
      Resultado.new(contenido: recortar(respuesta[:texto], CAMPOS[clave]), error: respuesta[:error], terminal: false)
    end

    private

    # Deja en cada registro de la respuesta solo los campos permitidos. Un
    # texto que no es JSON (un error) pasa tal cual.
    def recortar(texto, campos)
      return texto if campos.nil?

      datos = JSON.parse(texto)
      filtrar = ->(registro) { registro.is_a?(Hash) ? registro.slice(*campos, "count") : registro }
      JSON.generate(datos.is_a?(Array) ? datos.map(&filtrar) : filtrar.call(datos))
    rescue JSON::ParserError
      texto
    end

    def ofrecer_opciones(argumentos)
      texto = Formato.para_whatsapp(argumentos["texto"])
      opciones = Array(argumentos["opciones"]).map(&:to_s).reject(&:blank?).uniq.first(10)
      if opciones.size < 2
        return Resultado.new(contenido: "Hacen falta al menos 2 opciones.", error: true, terminal: false)
      end

      if opciones.size <= 3
        @respondedor.botones(texto, opciones.map { |o| { id: "op:#{o[0, 200]}", titulo: o } })
      else
        @respondedor.lista(texto, boton: "Ver opciones",
                                  filas: opciones.map { |o| { id: "op:#{o[0, 190]}", titulo: o } })
      end
      Resultado.new(contenido: "Mensaje enviado con las opciones. Espera la respuesta de la persona.",
                    error: false, terminal: true)
    end

    def adjuntar_comprobante(argumentos)
      gasto = ReportExpense.find_by(id: argumentos["report_expense_id"])
      unless gasto && gasto.user_invoice_id == @usuario.id
        return Resultado.new(contenido: "No encontré ese gasto entre los de esta persona.", error: true, terminal: false)
      end

      archivo = @conversacion.whatsapp_messages.entrantes.where.not(media_file: nil).order(:created_at).last
      return Resultado.new(contenido: "La persona no ha mandado ninguna foto ni PDF en esta conversación.", error: true, terminal: false) unless archivo

      respuesta = Adjunto.adjuntar(gasto.id, archivo, usuario: @usuario)
      Resultado.new(contenido: respuesta[:texto], error: respuesta[:error], terminal: false)
    end
  end
end

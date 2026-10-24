# frozen_string_literal: true

class ReportsCreateTool < ApplicationTool
  tool_name "reports_create"
  description "Crea un reporte de servicio en un centro de costo. Requiere cost_center_id y " \
              "report_date (YYYY-MM-DD, formato estricto: cualquier otra cosa se rechaza). " \
              "El reporte queda SIEMPRE a nombre de la persona identificada por X-Actor-Phone o " \
              "X-Actor-Email; si no se identifica a nadie y no se indica report_execute_id " \
              "explícito, la tool RECHAZA y no registra nada (nunca lo atribuye al Administrador). " \
              "El cliente (customer_id) sale del centro de costo; si se envía y no coincide con " \
              "el del centro, se rechaza. contact_id debe pertenecer a ese mismo cliente. " \
              "working_time, displacement_hours y viatic_value no admiten negativos (cero sí es " \
              "válido). working_value/total_value se calculan a partir de working_time × valor " \
              "hora del centro; displacement_hours se guarda valorizado " \
              "(value_displacement_hours) pero NO suma a total_value. " \
              "SIN cost_center_id (un servicio que todavia no tiene centro, igual que en el " \
              "formulario web) se crea un centro de costo nuevo: entonces son obligatorios " \
              "customer_id y cost_center_owner_id (una persona cuyo rol tiene «Puede ser " \
              "propietario»; es quien aprueba los gastos del centro), y contact_id debe ser de ese " \
              "cliente. El centro nuevo toma el valor hora por defecto de las parametrizaciones " \
              "(HORA HOMBRE COSTO) y su codigo sale del cliente (SER-<cliente>-<n>-<año>)."
  input_schema(
    properties: {
      cost_center_id:     { type: "integer", description: "ID del centro de costo. Si se omite, se crea uno nuevo (ver cost_center_owner_id)" },
      cost_center_owner_id: { type: "integer", description: "Solo sin cost_center_id: propietario del centro que se crea (una persona cuyo rol tiene «Puede ser propietario»)" },
      customer_id:        { type: "integer", description: "ID del cliente (opcional; por defecto el cliente del centro de costo. Si se envía y no coincide con el del centro, la tool rechaza)" },
      report_execute_id:  { type: "integer", description: "ID del usuario que ejecuta (opcional; por defecto la persona identificada por teléfono o correo)" },
      report_date:        { type: "string",  description: "Fecha del reporte YYYY-MM-DD (requerido). Formato estricto: cualquier otra cosa se rechaza." },
      contact_id:         { type: "integer", description: "ID del contacto (opcional; debe pertenecer al cliente del centro de costo)" },
      working_time:       { type: "number",  description: "Horas trabajadas (default 0, no puede ser negativo)" },
      displacement_hours: { type: "number",  description: "Horas de desplazamiento (default 0, no puede ser negativo)" },
      viatic_value:       { type: "number",  description: "Valor viáticos en COP (default 0, no puede ser negativo)" },
      work_description:   { type: "string",  description: "Descripción del trabajo (opcional)" },
      viatic_description: { type: "string",  description: "Descripción de viáticos (opcional)" }
    },
    required: %w[report_date]
  )

  # Sombrea a proposito la de ApplicationTool: aquella habla de gastos y aqui se
  # crean reportes. Fuera de `class << self` por la razon documentada en la base.
  NO_ACTOR_MESSAGE =
    "Error: no se pudo identificar a la persona que ejecuta el reporte. Envia X-Actor-Phone " \
    "o X-Actor-Email de un usuario registrado en Controlmatica, o indica report_execute_id " \
    "explicitamente. El reporte NO se registro."

  DATE_FORMAT = /\A\d{4}-\d{2}-\d{2}\z/.freeze

  NON_NEGATIVE = %i[working_time displacement_hours viatic_value].freeze

  WRITABLE = %i[cost_center_id customer_id report_execute_id report_date contact_id
                working_time displacement_hours viatic_value work_description viatic_description].freeze

  def self.call(report_date:, server_context:, cost_center_id: nil,
                customer_id: nil, report_execute_id: nil, cost_center_owner_id: nil, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    cc = nil
    if cost_center_id
      cc = CostCenter.find_by(id: cost_center_id)
      return not_found!("cost_center #{cost_center_id}") unless cc
    end

    # Estricto a proposito: el regex descarta "manana" y "08/09/2026" antes de
    # strptime, y strptime descarta los dias que no existen ("2026-02-30"). Sin
    # esto, la columna :date castea la basura a nil y el before_create del
    # modelo revienta con un 500.
    fecha = parse_date(report_date)
    unless fecha
      return text("Error: report_date invalida (#{report_date.inspect}). Usa el formato " \
                  "YYYY-MM-DD, por ejemplo 2026-09-08.")
    end

    return not_found!("customer #{customer_id}") if customer_id && !Customer.exists?(customer_id)
    if cc
      return text("Error: el centro de costo #{cc.code} no tiene cliente asociado.") if cc.customer.nil?
      return text("Error: el centro de costo #{cc.code} no tiene 'valor hora' (hour_real) definido.") if cc.hour_real.nil?
    else
      error = error_sin_centro(customer_id, cost_center_owner_id)
      return text(error) if error
    end

    # Se compara contra nil explicito y no con present?: 0 es present? y hay
    # que dejarlo pasar, que es el default valido.
    negativo = NON_NEGATIVE.find { |k| !args[k].nil? && args[k].to_f.negative? }
    if negativo
      return text("Error: #{negativo} no puede ser negativo (se recibio #{args[negativo]}). " \
                  "Usa 0 si no aplica.")
    end

    if cc && customer_id && customer_id.to_i != cc.customer_id
      return text("Error: el centro de costo #{cc.code} pertenece al cliente " \
                  "#{cc.customer.name} (id #{cc.customer_id}), no al cliente id #{customer_id}. " \
                  "Omite customer_id: el servidor lo toma del centro de costo.")
    end

    # El centro ya conoce a su cliente — el propio modelo arma el code_report
    # con self.cost_center.customer.id. Tomarlo de aca es lo unico que impide
    # que la fila nazca con dos clientes distintos (caso del reporte 11511).
    # Sin centro, el cliente es el que se eligio y el centro nuevo nace con el.
    cliente = cc ? cc.customer : Customer.find(customer_id)
    resolved_customer_id = cliente.id

    if args[:contact_id].present? &&
       !Contact.exists?(id: args[:contact_id], customer_id: resolved_customer_id)
      return text("Error: el contacto #{args[:contact_id]} no pertenece al cliente " \
                  "#{cliente.name} (id #{resolved_customer_id}). Usa contacts_list para " \
                  "elegir un contacto de ese cliente.")
    end

    actor = actor_user_strict(server_context)
    resolved_user_id = report_execute_id || actor&.id
    return text(NO_ACTOR_MESSAGE) unless resolved_user_id
    return not_found!("user #{resolved_user_id}") unless User.exists?(resolved_user_id)

    # COMPATIBILIDAD HACIA ATRAS: NO se usa as_actor_strict. Con
    # report_execute_id explicito y sin actor por header —el camino del
    # formulario web y de las integraciones viejas— as_actor_strict abortaria
    # y dejaria de crear reportes que hoy se crean. Se setea User.current a
    # mano sobre `creator`, igual que report_expenses_create con su `creator`.
    creator = actor || User.find(resolved_user_id)

    previous = User.current
    begin
      User.current = creator
      attrs = args.slice(*WRITABLE).merge(
        cost_center_id: cost_center_id, customer_id: resolved_customer_id,
        report_execute_id: resolved_user_id, report_date: fecha, origen: origen_de(server_context)
      )
      attrs[:working_time] = attrs[:working_time].to_f
      attrs[:displacement_hours] = attrs[:displacement_hours].to_f
      attrs[:viatic_value] = attrs[:viatic_value].to_f
      r = Report.new(attrs)
      r.user_id = creator.id if r.respond_to?(:user_id=)
      # Sin centro, Report#coste_center_verify crea uno con este propietario
      # (y Report#propietario_del_centro_nuevo lo vuelve a validar).
      r.cost_center_owner_id = cost_center_owner_id unless cc
      if r.save
        valorizar_con_el_centro_nuevo(r) unless cc
        json(Mcp::Serialize.record(r, ReportsListTool::KEYS))
      else
        text("Error: #{r.errors.full_messages.join(', ')}")
      end
    ensure
      User.current = previous
    end
  end

  # Report#create_total (before_save) valoriza el reporte ANTES de que
  # Report#coste_center_verify (before_create) cree el centro, asi que sin centro
  # el reporte nace en $0. La web lo arregla sin querer guardando dos veces
  # (ReportsController#create), lo que de paso deja una "edicion" en la
  # auditoria; aqui se recalcula con la misma formula sin pasar por ella.
  private_class_method def self.valorizar_con_el_centro_nuevo(reporte)
    centro = reporte.cost_center
    return unless centro

    hora = centro.hour_real.to_f
    reporte.update_columns(working_value: reporte.working_time.to_f * hora,
                           value_displacement_hours: reporte.displacement_hours.to_f * hora,
                           total_value: reporte.viatic_value.to_f + (reporte.working_time.to_f * hora))
    reporte.calculatate_update # las sumas del centro, como el after_save
  end

  # Sin centro de costo: el cliente y el propietario del centro nuevo son
  # obligatorios, y el propietario tiene que poder serlo (la misma lista del
  # formulario web: User.pueden_ser_propietarios).
  private_class_method def self.error_sin_centro(customer_id, owner_id)
    if customer_id.blank?
      return "Error: sin cost_center_id se crea un centro de costo nuevo y hace falta customer_id " \
             "(el cliente del servicio)."
    end
    if owner_id.blank?
      return "Error: sin cost_center_id se crea un centro de costo nuevo y hace falta " \
             "cost_center_owner_id: la persona que sera su propietaria."
    end
    return nil if User.pueden_ser_propietarios.where(id: owner_id).exists?

    "Error: el usuario #{owner_id} no puede ser propietario de un centro de costos. Elige a una " \
      "persona cuyo rol tenga «Puede ser propietario»."
  end

  private_class_method def self.parse_date(value)
    return value if value.is_a?(Date)

    str = value.to_s.strip
    return nil unless str.match?(DATE_FORMAT)

    Date.strptime(str, "%Y-%m-%d")
  rescue ArgumentError, TypeError
    nil
  end
end

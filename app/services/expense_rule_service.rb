# Unico lugar donde se evaluan las reglas de gasto (paquete 14).
#
# POR QUE UN SERVICIO Y NO UN `validate` DEL MODELO: este servicio EVALUA, no
# decide. Que una violacion frene el guardado o solo lo explique depende del
# flag `mandatory` de cada regla (pedido de producto, 2026-09-15), y quien
# aplica esa consecuencia es `ReportExpense#enforce_expense_rules`. Partirlo asi
# es lo que permite que la web, WhatsApp y el import de Excel compartan el
# veredicto y no cada uno su propia interpretacion.
#
# HISTORIA DE ESTE ARCHIVO, PORQUE EXPLICA LOS COMENTARIOS QUE QUEDAN ABAJO:
# hasta 2026-08-29 ninguna violacion impedia guardar, solo bajaba el gasto a
# "sin aprobar"; la adenda A.2 las volvio todas duras; el flag `mandatory` hace
# de eso una decision regla por regla y devuelve la rama blanda, que nunca se
# borro (`ReportExpense#apply_expense_rules`).
#
# LAS TRES REGLAS DETERMINISTAS SE EVALUAN AQUI Y SOLO AQUI, en el servidor.
# Si alguna se moviera al prompt del agente, un gasto creado por la web dejaria
# de validarse y apareceria una asimetria entre canales que nadie notaria hasta
# la auditoria contable.
class ExpenseRuleService
  # Codigos estables. Los consume la pantalla (para elegir el icono) y el agente
  # (para decidir que preguntar): cambiarlos rompe a los dos.
  CODE_TOO_OLD    = "invoice_too_old".freeze
  CODE_VALUE      = "invoice_value_exceeded".freeze
  CODE_DUPLICATE  = "duplicate_invoice".freeze
  # Veredicto SEMANTICO: lo emite el agente al leer el comprobante contra las
  # `agent_instructions`, no lo calcula este servidor. Llega por parametro y se
  # traduce a una violacion mas para que los dos canales lo traten igual.
  CODE_AGENT      = "agent_instructions".freeze
  # La regla le prohibe a esta persona este tipo de gasto (2026-10-14). Es
  # determinista: quien registra y el tipo los sabe el servidor, no hay nada que
  # interpretar.
  CODE_PROHIBITED = "expense_prohibited".freeze

  # Result canonico del proyecto, identico al de ExpenseBudgetService
  # (00-ARQUITECTURA.md §4.2). `errors` es SIEMPRE un array.
  Result = Struct.new(:ok, :value, :errors, keyword_init: true) do
    def ok?    = ok
    def error? = !ok
  end

  # Evalua un gasto contra las reglas aplicables a su responsable.
  #
  # `expense` puede estar persistido o ser uno nuevo sin guardar: el agente
  # valida ANTES de crear. Si no se pasa `user`, se usa `expense.user_invoice`.
  #
  # => Result cuyo `value` es
  #    { ok: true/false,
  #      violations: [{ rule:, code:, message: }],           # la foto completa
  #      blocking_violations: [{ rule:, code:, message: }],  # las que FRENAN
  #      agent_instructions: "…texto concatenado…",           # lo aplica el agente
  #      applied_rules: ["Regla general"] }
  #
  # `ok` del Result y `ok` del value son lo mismo a proposito: quien solo quiera
  # saber si paso usa `result.ok?` y quien necesite el detalle abre el value.
  #
  # OJO CON `ok`: mira `violations`, NO `blocking_violations`. Un gasto que solo
  # incumple reglas blandas trae `ok: false` y se puede guardar igual. Quien
  # decide si guardar o no tiene que preguntar por `blocking_violations`.
  #
  # POR QUE DOS JUEGOS DE VIOLACIONES Y NO UN CAMPO `mandatory` EN CADA UNA:
  # `effective_limits` colapsa las N reglas de la persona en UN tope tomando el
  # minimo, asi que una violacion no tiene una regla dueña de la que heredar el
  # flag —por eso `violation` deja `rule` en nil—. La unica forma honesta de
  # saber que frena es volver a resolver los limites usando SOLO las reglas
  # obligatorias y evaluar contra esos.
  # `agent_verdict` es el juicio del agente sobre las `agent_instructions` —el
  # texto libre que este servidor NO sabe evaluar—, con la forma
  # `{ compliant: true/false/nil, findings: ["motivo", ...] }` —o, desde el
  # 2026-10-14, `findings: [{ rule_id:, message: }]`—. Entra por
  # parametro porque quien lo produce es el agente de IA: la web se lo pide
  # al leer el comprobante y lo reenvia al guardar. `nil` (o `compliant` nil)
  # significa "nadie lo juzgo" y no genera violacion: un gasto escrito a mano,
  # sin comprobante, no puede quedar bloqueado por una pregunta que nunca se
  # hizo.
  def self.validate(expense, user: nil, agent_verdict: nil)
    responsable = user || expense&.user_invoice
    # LAS REGLAS DEL GASTO, NO SOLO LAS DE LA PERSONA (2026-10-14): una regla de
    # "Solo estos tipos" o "Excepto estos" se filtra aqui por el tipo del gasto,
    # asi que una regla que no aplica a este tipo no aporta limites, ni
    # instrucciones, ni prohibicion.
    reglas = ExpenseRule.para_gasto(responsable, expense&.type_identification_id)

    limites = effective_limits(reglas)
    # Segundo juego de limites, con el mismo minimo pero solo sobre las reglas
    # que frenan. Al ser un subconjunto, su tope es siempre IGUAL O MAS FLOJO
    # que el efectivo: `blocking` nunca puede tener una violacion que no este
    # tambien —por el mismo code— en `violations`.
    limites_duros = effective_limits(reglas.select(&:mandatory))

    violations = []
    blocking   = []

    # Las prohibiciones van primero: si el gasto no se permite, es lo primero
    # que la persona tiene que leer, antes que una fecha o un tope.
    prohibiciones = check_prohibitions(expense, reglas)
    violations.concat(prohibiciones[:violations])
    blocking.concat(prohibiciones[:blocking])

    # Antiguedad y valor son calculo puro: evaluarlos dos veces no cuesta una
    # consulta y evita tener que adivinar de que regla salio cada violacion.
    violations.concat(check_age(expense, limites[:max_invoice_age_days]))
    blocking.concat(check_age(expense, limites_duros[:max_invoice_age_days])) if antiguedad_frena?(expense)
    violations.concat(check_value(expense, limites[:max_invoice_value]))
    blocking.concat(check_value(expense, limites_duros[:max_invoice_value]))

    # DUPLICADOS SE CONSULTA UNA SOLA VEZ: es el unico check que va a la base, y
    # correrlo dos veces duplicaria la consulta en cada guardado de cada gasto.
    # Se puede reusar el resultado porque el check no depende de ningun limite,
    # solo de si alguna regla lo pide.
    if limites[:check_duplicates]
      duplicado = check_duplicate(expense)
      violations.concat(duplicado)
      blocking.concat(duplicado) if limites_duros[:check_duplicates]
    end

    # El veredicto del agente sobre el texto libre. Ver `check_agent_policy`:
    # desde el 2026-10-14 cada hallazgo trae la regla de la que salio, y eso
    # decide si aplica a este gasto y si frena.
    semanticas = check_agent_policy(agent_verdict, reglas)
    violations.concat(semanticas[:violations])
    blocking.concat(semanticas[:blocking])

    valor = {
      ok: violations.empty?,
      violations: violations,
      blocking_violations: blocking,
      agent_instructions: limites[:agent_instructions],
      applied_rules: reglas.map(&:name)
    }

    Result.new(ok: violations.empty?, value: valor, errors: violations.map { |v| v[:message] })
  end

  # Combina N reglas en UN juego de limites.
  #
  # GANA LA MAS RESTRICTIVA, y es una decision con consecuencias: la alternativa
  # —que la regla mas especifica sobrescriba a la general— permitiria que
  # asignarle una regla a alguien AFLOJE un control, que es justo lo contrario
  # de lo que espera quien administra.
  #
  #   * max_invoice_age_days y max_invoice_value: el MINIMO de los no nulos.
  #     `nil` significa "sin limite", asi que nunca puede ganar a un numero.
  #   * check_duplicates: activo si ALGUNA lo pide.
  #   * agent_instructions: se concatenan todas las no vacias, en orden de
  #     `name`, cada una en su propio parrafo.
  def self.effective_limits(reglas)
    reglas = Array(reglas)

    { max_invoice_age_days: reglas.map(&:max_invoice_age_days).compact.min,
      max_invoice_value: reglas.map(&:max_invoice_value).compact.min,
      check_duplicates: reglas.any?(&:check_duplicates),
      agent_instructions: reglas.sort_by { |r| r.name.to_s }
                                .map(&:texto_para_el_agente)
                                .reject(&:empty?)
                                .join("\n\n") }
  end

  # Los limites ya resueltos de un usuario, para la pantalla y para el agente.
  def self.limits_for(user)
    effective_limits(ExpenseRule.aplicables_a(user).to_a)
  end

  # El veredicto del agente contra un juego de reglas dado, sin el resto de la
  # validacion: `{ violations:, blocking: }`. Lo usa la lectura del comprobante
  # para avisar ANTES de guardar, cuando todavia no hay gasto que validar y,
  # si no se eligio tipo, con las reglas de todos los tipos de la persona.
  def self.agent_verdict_preview(verdict, reglas)
    check_agent_policy(verdict, Array(reglas))
  end

  # Las reglas con texto para el agente, en la forma que espera
  # ReceiptExtractionService (`context[:reglas]`): una por bloque, con su numero,
  # para que cada hallazgo vuelva diciendo de que regla salio.
  def self.reglas_para_el_agente(reglas)
    Array(reglas).filter_map do |r|
      texto = r.texto_para_el_agente
      { id: r.id, nombre: r.name, instrucciones: texto } if texto.present?
    end
  end

  # Solo las prohibiciones de un gasto, sin topes ni duplicados ni veredicto.
  #
  # Existe para la EDICION (ReportExpense#enforce_expense_rules): al editar un
  # gasto viejo no se reevaluan los limites si no cambio un campo que ellos
  # miran —seria dejar ilegible un gasto del año pasado por un tope de hoy—,
  # pero cambiarle el tipo o el responsable SI tiene que poder chocar con una
  # prohibicion. Si no, cualquiera la saltaria creando el gasto con otro tipo y
  # cambiandoselo despues.
  def self.prohibitions_for(expense, user: nil)
    responsable = user || expense&.user_invoice
    check_prohibitions(expense, ExpenseRule.para_gasto(responsable, expense&.type_identification_id))
  end

  # --- Doble aprobacion (2026-10-18) -------------------------------------------

  # Las reglas que le piden a ESTE gasto una segunda aprobacion, con quien la da.
  # Es la foto que se guarda en `ReportExpense#second_approval_rules`:
  #
  #   [{ "rule_id" => 7, "rule" => "Montos altos", "rol_id" => 3, "user_id" => nil,
  #      "approver" => "Cargo: Gerencia", "reasons" => ["El valor supera..."],
  #      "ia_reasons" => [] }]
  #
  # REGLA POR REGLA Y NO CON `validate`: ahi los topes se colapsan en un minimo
  # y la violacion no sabe de que regla salio (`rule: nil`). Aqui se pregunta a
  # cada regla con doble aprobacion si ELLA, con sus propios limites, se
  # incumple. Sin reglas con doble aprobacion no se consulta nada mas, que es el
  # caso de hoy: los gastos de siempre no pagan nada por esto.
  #
  # LO QUE ENCONTRO LA IA SOBREVIVE A UNA EDICION SIN COMPROBANTE NUEVO: sin
  # veredicto en este guardado (`agent_verdict` nil) se conservan los motivos de
  # IA de la foto anterior (`previa`). Si no, corregir la descripcion de un gasto
  # con licor le quitaria la segunda aprobacion.
  def self.segunda_aprobacion(expense, agent_verdict: nil, previa: [])
    return [] if expense.blank?

    reglas = ExpenseRule.para_gasto(expense.user_invoice, expense.type_identification_id)
                        .select(&:pide_segunda_aprobacion?)
    return [] if reglas.empty?

    ia = if agent_verdict.present?
           motivos_de_ia_por_regla(agent_verdict, reglas, expense)
         else
           Array(previa).each_with_object({}) { |f, acc| acc[f["rule_id"]] = Array(f["ia_reasons"]) }
         end
    duplicado = nil

    reglas.filter_map do |regla|
      motivos = []
      if regla.prohibe_el_tipo?(expense.type_identification_id)
        motivos << "El tipo «#{expense.type_identification&.name.to_s.squish}» necesita aprobación"
      end
      motivos.concat(check_age(expense, regla.max_invoice_age_days).map { |v| v[:message] })
      motivos.concat(check_value(expense, regla.max_invoice_value).map { |v| v[:message] })
      if regla.check_duplicates
        duplicado = check_duplicate(expense) if duplicado.nil?
        motivos.concat(duplicado.map { |v| v[:message] })
      end
      motivos_ia = Array(ia[regla.id])
      next if motivos.empty? && motivos_ia.empty?

      { "rule_id" => regla.id, "rule" => regla.name, "rol_id" => regla.second_approver_rol_id,
        "user_id" => regla.second_approver_user_id, "approver" => regla.segundo_aprobador_label,
        "reasons" => motivos, "ia_reasons" => motivos_ia }
    end
  end

  # {rule_id => [motivo, ...]} de lo que encontro la IA. Un hallazgo SIN regla
  # solo se le atribuye a una regla con doble aprobacion si es la UNICA regla
  # del gasto con texto para la IA: con dos, adivinar de cual salio seria pedir
  # una aprobacion que ninguna regla pidio.
  def self.motivos_de_ia_por_regla(verdict, reglas_dobles, expense)
    v = verdict.respond_to?(:with_indifferent_access) ? verdict.with_indifferent_access : verdict
    return {} unless v[:compliant] == false

    con_texto = ExpenseRule.para_gasto(expense.user_invoice, expense.type_identification_id)
                           .select { |r| r.texto_para_el_agente.present? }
    hallazgos = normalizar_hallazgos(v[:findings])
    unica = con_texto.size == 1 ? con_texto.first : nil
    if hallazgos.empty? && unica
      hallazgos = [{ rule_id: unica.id, message: "El comprobante no cumple las instrucciones de la regla" }]
    end

    ids_dobles = reglas_dobles.map(&:id)
    hallazgos.each_with_object(Hash.new { |h, k| h[k] = [] }) do |h, acc|
      regla_id = h[:rule_id] || unica&.id
      acc[regla_id] << h[:message] if ids_dobles.include?(regla_id)
    end
  end
  private_class_method :motivos_de_ia_por_regla

  # --- Reglas deterministas --------------------------------------------------

  # UNA VIOLACION POR REGLA, CON SU NOMBRE. A diferencia de los topes —que se
  # colapsan en un minimo y por eso no tienen regla dueña—, una prohibicion es de
  # una regla concreta, y decirle a la persona cual es lo unico que le permite
  # preguntar a quien corresponde. Frena si ESA regla es obligatoria.
  #
  # `reglas` ya viene filtrado por persona y por tipo (ExpenseRule.para_gasto):
  # si una regla que prohibe llego hasta aqui, es que aplica a este gasto.
  def self.check_prohibitions(expense, reglas)
    tipo = expense&.type_identification&.name.to_s.squish.presence || "este tipo"
    violations = []
    blocking   = []

    # Los tipos de la regla son los prohibidos (2026-10-16): frena la que tenga
    # entre ellos el tipo de ESTE gasto.
    #
    # EL MENSAJE DEPENDE DE «IMPEDIR GUARDAR»: sin ella el gasto SI se guarda y
    # solo queda sin aprobar («todo gasto de representacion debe ser aprobado»),
    # y decirle a la persona que no tiene permitido registrarlo seria falso.
    reglas.select { |r| r.prohibe_el_tipo?(expense&.type_identification_id) }.each do |regla|
      mensaje = if regla.mandatory
                  "No tiene permitido registrar gastos de tipo «#{tipo}» (regla «#{regla.name}»)"
                else
                  "Los gastos de tipo «#{tipo}» necesitan aprobación (regla «#{regla.name}»)"
                end
      v = violation(CODE_PROHIBITED, mensaje, rule: regla.name)
      violations << v
      blocking << v if regla.mandatory
    end

    { violations: violations, blocking: blocking }
  end
  private_class_method :check_prohibitions

  # LA ANTIGUEDAD ES LA QUE TENIA EL COMPROBANTE EL DIA EN QUE SE REGISTRO EL
  # GASTO, NO LA DE HOY (2026-10-19). Medida siempre contra hoy, el paso del
  # tiempo volvia infractor a un gasto registrado a tiempo: una factura de 31
  # dias registrada con una regla de 60, abierta dos meses despues, ya "tenia 92
  # dias" y no se podia ni corregirle la descripcion. Al crear, el dia del
  # registro es hoy, asi que para un gasto nuevo nada cambia.
  #
  # Sigue cerrando el fraude que la regla quiere evitar —registrar tarde una
  # factura vieja— y tambien el de registrarla con la fecha de hoy y moverla
  # despues: correr la fecha hacia atras suma dias al registro.
  def self.check_age(expense, max_days)
    return [] if max_days.blank?
    # `invoice_date` nula: no se evalua y no se inventa una fecha. Un gasto sin
    # fecha es un dato incompleto, no una infraccion.
    return [] if expense&.invoice_date.blank?

    dias = (fecha_de_registro(expense) - expense.invoice_date.to_date).to_i
    return [] if dias <= max_days

    mensaje = if expense.new_record?
                "El comprobante tiene #{dias} días y el máximo son #{max_days}"
              else
                "El comprobante tenía #{dias} días cuando se registró el gasto y el máximo son #{max_days}"
              end
    [violation(CODE_TOO_OLD, mensaje)]
  end

  # Hoy para un gasto nuevo; `created_at` para uno guardado, que no se mueve.
  # Un gasto nuevo usa hoy aunque traiga `created_at` asignado: fechar el
  # registro hacia atras no puede servir para que una factura vieja pase.
  def self.fecha_de_registro(expense)
    return Date.current if expense.new_record? || expense.created_at.blank?

    expense.created_at.in_time_zone.to_date
  end
  private_class_method :fecha_de_registro

  # AL EDITAR, LA ANTIGUEDAD SOLO FRENA SI CAMBIO LA FECHA. Contada al dia del
  # registro ya no la mueve el tiempo, pero un gasto que se registro fuera de
  # plazo —con una regla blanda que despues se endurecio, o un historico de
  # antes de la regla— quedaria sin poder corregirle el valor por una
  # antiguedad que nadie esta tocando. La foto (`violations`) la sigue anotando.
  def self.antiguedad_frena?(expense)
    expense.nil? || expense.new_record? || expense.invoice_date_changed?
  end
  private_class_method :antiguedad_frena?

  # El tope es INCLUSIVO: un gasto exactamente igual al tope NO viola. Un tope de
  # $200.000 que rechaza un gasto de $200.000 es incomprensible para quien lo
  # configura.
  #
  # SE MIDE CONTRA EL MAYOR ENTRE invoice_total Y invoice_value + invoice_tax, Y
  # NO CONTRA invoice_total SOLO (2026-10-05). `invoice_total` tiene default 0.0
  # y es OPCIONAL en la tool del agente (report_expenses_create_tool.rb), asi que
  # un gasto de WhatsApp que llegue con valor e IVA pero sin total se media
  # contra 0 y pasaba cualquier tope: se verifico con un gasto de $5.950.000
  # contra una regla obligatoria de $100.000. El formulario web no tenia el
  # problema porque calcula el total y lo manda siempre, y por eso el hueco solo
  # existia en un canal, que es justo la asimetria que este paquete evita.
  #
  # EL MAYOR Y NO LA SUMA A SECAS: `invoice_total` es el total DEL COMPROBANTE y
  # en moneda extranjera no es la suma de los dos COP convertidos (ver
  # ReportExpense#apply_currency_conversion), asi que reemplazarlo moveria los
  # topes de los gastos en divisa. Tomar el mayor respeta ese numero cuando
  # existe y solo entra a suplirlo cuando viene en cero.
  #
  # El presupuesto, en cambio, consume `invoice_value` (ExpenseBudgetService::
  # SPENT_EXPR): son dos campos distintos a proposito —el cupo se mide sin IVA—,
  # y por eso aqui no se puede mirar uno solo de los dos.
  def self.check_value(expense, max_value)
    return [] if max_value.blank?

    total = valor_evaluable(expense)
    return [] if total <= max_value.to_d

    [violation(CODE_VALUE, "El valor supera el tope de #{ExpenseBudgetService.money(max_value)}")]
  end

  # El valor contra el que se mide el tope. Publico porque la pantalla de reglas
  # y el agente tienen que poder explicar el mismo numero que frena.
  def self.valor_evaluable(expense)
    return BigDecimal(0) if expense.blank?

    [expense.invoice_total.to_d,
     expense.invoice_value.to_d + expense.invoice_tax.to_d].max
  end

  # DUPLICADO SOLO CON invoice_number E identification AMBOS PRESENTES. Con
  # campos vacios, media base de datos seria "duplicada" entre si.
  #
  # Y NUNCA EN UN VIATICO NI CON UN NUMERO DE RELLENO (2026-10-14). Un viatico
  # no tiene factura: la gente escribe "N/A" o su cedula en el numero, y en el
  # NIT la cedula de quien lo recibe, asi que el segundo viatico de la misma
  # persona chocaba con el primero y no habia forma de registrarlo. El mismo
  # "N/A" en cualquier otro tipo es un numero que no existe, no una factura que
  # se repite.
  def self.check_duplicate(expense)
    return [] if expense.blank?
    return [] if expense.invoice_number.blank? || expense.identification.blank?
    return [] if expense.type_identification&.viatico?
    return [] if numero_de_relleno?(expense)

    scope = ReportExpense.where(invoice_number: expense.invoice_number,
                                identification: expense.identification)
    # Al editar hay que excluir el propio registro o el gasto se acusa a si
    # mismo de duplicado en cada guardado.
    scope = scope.where.not(id: expense.id) if expense.id.present?

    otro = scope.order(:id).first
    return [] if otro.nil?

    [violation(CODE_DUPLICATE,
               "Ya existe el gasto ##{otro.id} con esa factura de ese proveedor")]
  end

  # Lo que la gente escribe cuando el comprobante no tiene numero. Se comparan
  # sin tildes, espacios ni signos: "N/A", "n.a.", "No aplica" y "S/N" son el
  # mismo relleno.
  NUMEROS_DE_RELLENO = %w[NA NOAPLICA SN SINNUMERO SINFACTURA NOTIENE NINGUNO NULL NONE].freeze

  # Tambien es relleno un numero hecho solo de ceros, o igual al NIT/cedula del
  # mismo gasto: es quien recibe el viatico copiando su documento en el campo
  # del numero, no un numero de factura.
  def self.numero_de_relleno?(expense)
    numero = solo_letras_y_digitos(expense.invoice_number)
    return true if NUMEROS_DE_RELLENO.include?(numero) || numero.match?(/\A0+\z/)

    documento = solo_letras_y_digitos(expense.identification)
    documento.present? && numero == documento
  end
  private_class_method :numero_de_relleno?

  def self.solo_letras_y_digitos(texto)
    I18n.transliterate(texto.to_s).upcase.gsub(/[^A-Z0-9]/, "")
  end
  private_class_method :solo_letras_y_digitos

  # `rule` se deja en nil porque el limite efectivo puede venir de la
  # combinacion de varias reglas y atribuirselo a una sola seria mentir; los
  # nombres de todas van en `applied_rules`.
  # Traduce el veredicto del agente a violaciones. Una por MOTIVO, no una sola
  # con todos los motivos pegados: cada motivo es un incumplimiento distinto y
  # la pantalla los pinta en lista.
  #
  # Sin motivos pero con `compliant: false` se emite una violacion generica: que
  # el agente no explique por que no puede traducirse en "entonces no pasa
  # nada", o bastaria con devolver el veredicto pelado para saltarse la regla.
  #
  # CADA HALLAZGO TRAE SU REGLA (2026-10-14), `{ rule_id:, message: }`, y eso
  # cambia dos cosas:
  #
  #   * QUE APLICA. En la web el agente juzga al extraer, antes de que se elija
  #     el tipo, contra las reglas de TODOS los tipos de la persona. Un hallazgo
  #     de una regla que existe pero no le aplica a este gasto —el licor en uno
  #     de representacion— se suelta: habla de una regla que aqui no rige.
  #   * QUE FRENA. Antes cualquier hallazgo frenaba si ALGUNA regla obligatoria
  #     tenia texto, asi que una regla blanda no podia ser blanda al lado de una
  #     dura. Ahora frena si su regla es obligatoria.
  #
  # Un hallazgo SIN regla (el formato de antes, o un agente que no la dijo) se
  # trata como antes: aplica, y frena si alguna regla obligatoria tiene texto.
  # No se puede soltar un incumplimiento solo porque no trae etiqueta.
  #
  # `reglas` son las del gasto, ya filtradas por persona y tipo.
  def self.check_agent_policy(verdict, reglas)
    vacio = { violations: [], blocking: [] }
    con_texto = reglas.select { |r| r.texto_para_el_agente.present? }
    # Sin instrucciones que apliquen, no hay nada que el veredicto pueda decir.
    return vacio if verdict.blank? || con_texto.empty?

    v = verdict.respond_to?(:with_indifferent_access) ? verdict.with_indifferent_access : verdict
    # nil es "nadie lo juzgo"; solo false es un incumplimiento.
    return vacio unless v[:compliant] == false

    por_id    = con_texto.index_by(&:id)
    hallazgos = normalizar_hallazgos(v[:findings])

    vigentes = if hallazgos.empty?
                 [{ rule_id: nil, message: "El comprobante no cumple las instrucciones de la regla de gasto" }]
               else
                 descartar_reglas_que_no_aplican(hallazgos, por_id)
               end
    # Todos los motivos eran de reglas que a este gasto no le aplican.
    return vacio if vigentes.empty?

    alguna_obligatoria = con_texto.any?(&:mandatory)
    vigentes.each_with_object(vacio) do |h, acc|
      regla = por_id[h[:rule_id]]
      hallazgo = violation(CODE_AGENT, h[:message], rule: regla&.name)
      acc[:violations] << hallazgo
      acc[:blocking] << hallazgo if regla ? regla.mandatory : alguna_obligatoria
    end
  end
  private_class_method :check_agent_policy

  # Acepta motivos sueltos (el formato de antes del 2026-10-14) y objetos
  # `{ rule_id:, message: }`. Un `rule_id` que no es un entero se pierde: es un
  # hallazgo sin regla, no un error.
  def self.normalizar_hallazgos(crudos)
    Array(crudos).filter_map do |h|
      if h.respond_to?(:to_h) && !h.is_a?(String)
        h = h.to_h.with_indifferent_access
        mensaje = h[:message].to_s.strip
        regla = h[:rule_id].to_s.strip.match?(/\A\d+\z/) ? h[:rule_id].to_i : nil
      else
        mensaje = h.to_s.strip
        regla = nil
      end
      { rule_id: regla, message: mensaje } unless mensaje.empty?
    end
  end
  private_class_method :normalizar_hallazgos

  # Suelta los hallazgos de reglas que EXISTEN pero no estan entre las de este
  # gasto. Un `rule_id` que no es de ninguna regla (el agente se invento el
  # numero) se queda como hallazgo sin regla: soltarlo seria dejar pasar un
  # incumplimiento por un error de etiqueta.
  def self.descartar_reglas_que_no_aplican(hallazgos, por_id)
    ajenas = hallazgos.filter_map { |h| h[:rule_id] }.uniq - por_id.keys
    existentes = ajenas.any? ? ExpenseRule.where(id: ajenas).pluck(:id) : []

    hallazgos.filter_map do |h|
      next if h[:rule_id] && existentes.include?(h[:rule_id])

      por_id.key?(h[:rule_id]) ? h : h.merge(rule_id: nil)
    end
  end
  private_class_method :descartar_reglas_que_no_aplican

  def self.violation(code, message, rule: nil)
    { rule: rule, code: code, message: message }
  end
  private_class_method :violation
end

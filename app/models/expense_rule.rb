# == Schema Information
#
# Table name: expense_rules
#
#  id                   :bigint           not null, primary key
#  active               :boolean          default(TRUE), not null
#  agent_instructions   :text
#  applies_to_all_roles :boolean          default(FALSE), not null
#  check_duplicates     :boolean          default(TRUE), not null
#  is_default           :boolean          default(FALSE), not null
#  mandatory            :boolean          default(TRUE), not null
#  max_invoice_age_days :integer
#  max_invoice_value    :decimal(15, 2)
#  name                 :string           not null
#  observations         :text
#  prohibits_expense    :boolean          default(FALSE), not null
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  last_user_edited_id  :integer
#  user_id              :integer
#
# Indexes
#
#  index_expense_rules_on_active              (active)
#  index_expense_rules_on_is_default          (is_default)
#  index_expense_rules_unique_default_active  (is_default) UNIQUE WHERE (is_default AND active)
#

# Regla de gasto configurable, asignable a un conjunto de personas.
#
# LA IDEA CENTRAL DEL DISENO ES QUE UNA REGLA MEZCLA DOS NATURALEZAS:
#
#   * DETERMINISTA (max_invoice_age_days, max_invoice_value, check_duplicates):
#     la evalua el SERVIDOR, siempre. No hay nada que interpretar: o la factura
#     tiene 40 dias o no los tiene. Vive aqui para que un gasto que entra por la
#     web se valide exactamente igual que uno que entra por WhatsApp.
#   * SEMANTICA (agent_instructions): texto libre que este modelo NO evalua
#     nunca. Lo juzga el agente de Taimes, que si tiene criterio, y el servidor
#     solo APLICA el veredicto que el agente le devuelve
#     (ReportExpense#agent_policy_verdict).
#
# Mover una regla determinista al prompt del agente rompe la simetria entre
# canales en silencio: el gasto por la web deja de validarse y nadie se entera.
#
# LOS DOS CANALES JUZGAN EL TEXTO LIBRE (2026-10-03). Antes solo lo veia el
# agente de WhatsApp; ahora la web tambien se lo manda al agente extractor al
# pulsar "Extraer datos del comprobante" (docs/TAIMES-EXTRACTOR-COMPROBANTES.md).
# Un gasto escrito a mano, sin esa lectura, sigue sin veredicto y se registra
# igual: el servidor no sabe evaluar estas instrucciones y no puede frenar un
# gasto por una pregunta que nadie hizo.
#
# `mandatory` NO ES NI UNA COSA NI LA OTRA: no es un limite que se evalue, es la
# CONSECUENCIA de incumplir esta regla. `true` frena la creacion del gasto (web
# y movil); `false` la deja pasar, anota la violacion y baja el gasto a "sin
# aprobar" con el motivo. Alcanza TAMBIEN al veredicto semantico desde el
# 2026-10-03: una regla obligatoria cuyas instrucciones el agente da por
# incumplidas frena el guardado.
class ExpenseRule < ApplicationRecord
  # POR ROL Y NO POR USUARIO (2026-09-10). Mantener la lista persona por persona
  # es trabajo que nadie hace: cada usuario nuevo hay que acordarse de agregarlo,
  # y olvidarlo no produce ningun error —`aplicables_a` cae a la regla por
  # defecto—, asi que el olvido no se nota hasta que alguien registra un gasto
  # que debia haberse rechazado. El rol ya se asigna al crear el usuario.
  has_and_belongs_to_many :rols
  belongs_to :user,             optional: true   # quien la creo
  belongs_to :last_user_edited, class_name: "User", optional: true

  # A QUIEN Y A QUE TIPO DE GASTO APLICA (2026-10-14). El cliente escribia esas
  # condiciones en el texto para el agente ("combustible solo para German...",
  # "representacion solo esos tres roles", "licor solo en representacion") y el
  # agente, que solo ve el comprobante, adivinaba. Son datos que el sistema ya
  # tiene, asi que se deciden aqui y no en el prompt.
  #
  #   * excluded_rols: solo cuenta con `applies_to_all_roles` ("Todos los roles,
  #     excepto"). Con la lista de `rols` no hace falta: basta no incluirlo.
  #   * excluded_users: excepciones por persona, en los dos modos. NO es la
  #     asignacion persona por persona que se quito el 2026-09-10: es una lista
  #     corta de nombres que el cliente da explicitamente ("menos estos cuatro").
  #   * included_types / excluded_types: "Solo estos tipos" y "Excepto estos".
  #     Vacio en incluidos significa TODOS los tipos —al reves que roles, donde
  #     vacio es nadie—, y por eso la pantalla lo dice al lado del campo.
  has_and_belongs_to_many :excluded_rols,  class_name: "Rol",
                                           join_table: "expense_rules_excluded_rols",
                                           association_foreign_key: "rol_id"
  has_and_belongs_to_many :excluded_users, class_name: "User",
                                           join_table: "expense_rules_excluded_users",
                                           association_foreign_key: "user_id"
  has_and_belongs_to_many :included_types, class_name: "ReportExpenseOption",
                                           join_table: "expense_rules_included_types",
                                           association_foreign_key: "report_expense_option_id"
  has_and_belongs_to_many :excluded_types, class_name: "ReportExpenseOption",
                                           join_table: "expense_rules_excluded_types",
                                           association_foreign_key: "report_expense_option_id"

  # LOS TIPOS DE UNA REGLA SON LOS QUE NO SE PUEDEN REGISTRAR (2026-10-16).
  # `included_types` ya no dice «en que tipos aplica la regla»: dice que tipos
  # de gasto se le frenan a quien le aplique. Los limites (antiguedad, tope,
  # duplicados, lo que la IA no acepta) son otra cosa y se revisan en todos los
  # tipos, salvo los de `excluded_types`. El cliente lo leia asi y configuro la
  # regla de Representacion con el tipo elegido y sin marcar «Prohibir el
  # gasto»: con el significado anterior no frenaba nada.
  #
  # `prohibits_expense` queda como columna derivada —la leen el serializer, la
  # tabla y el MCP— y se recalcula en cada guardado.
  before_validation :prohibir_si_tiene_tipos

  validates :name, presence: true
  # Unico ENTRE ACTIVAS y no en toda la tabla: desactivar una regla es la forma
  # de archivarla, y el nombre tiene que poder reutilizarse despues.
  validate  :name_unico_entre_activas
  validates :max_invoice_age_days, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validates :max_invoice_value,    numericality: { greater_than: 0 }, allow_nil: true
  validates :active, :is_default, :check_duplicates, :mandatory, :applies_to_all_roles,
            :prohibits_expense, inclusion: { in: [true, false] }
  validate  :una_sola_default_activa
  validate  :tipos_sin_cruce
  validate  :por_defecto_no_es_para_todos

  scope :activas, -> { where(active: true) }
  scope :default_activa, -> { activas.where(is_default: true) }
  # Recibe un User (lo normal) o un rol_id suelto. Solo las reglas de "Solo
  # estos roles": las de "Todos los roles" no tienen filas en `rols`.
  scope :para_usuario, ->(user) {
    rol_id = user.is_a?(User) ? user.rol_id : user
    return none if rol_id.blank?

    activas.where(applies_to_all_roles: false).joins(:rols).where(rols: { id: rol_id })
  }

  # RESOLUCION DE QUE REGLA APLICA A QUIEN. Es la parte donde se cometen los
  # errores, asi que vive en un solo metodo:
  #
  #   reglas activas de "Solo estos roles" que incluyen el rol del usuario
  #   |- si hay al menos una -> esas
  #   \- si no hay ninguna   -> la regla default activa (si existe)
  #                             \- si tampoco existe -> sin restricciones
  #   + SIEMPRE, ademas: las reglas de "Todos los roles" que no excluyen su rol
  #
  #   y de todo eso se quitan las reglas que excluyen a la persona por nombre.
  #
  # LAS DE "TODOS LOS ROLES" SE SUMAN Y NO DESPLAZAN A LA POR DEFECTO, y es la
  # decision con mas consecuencias de este metodo. Si contaran como "regla
  # asignada", crear una regla general ("sin licor, para todos") le quitaria la
  # regla por defecto a toda la empresa sin ningun aviso. Las de "Solo estos
  # roles" siguen funcionando exactamente igual que antes del 2026-10-14.
  #
  # Una persona excluida de su unica regla especifica cae a la por defecto, como
  # quien no tiene ninguna: excluirla es sacarla de ESA regla, no de todas.
  #
  # OJO: "sin roles asignados" NO significa "todos", significa "ninguno". Para
  # "todos" estan "Todos los roles" y el switch de regla por defecto.
  #
  # NO FILTRA POR TIPO DE GASTO: eso depende del gasto, no de la persona, y lo
  # hace `para_gasto`. Las pantallas que muestran "las reglas de fulano" usan
  # este metodo tal cual.
  def self.aplicables_a(user)
    return none if user.blank?

    persona_id = user.is_a?(User) ? user.id : nil
    rol_id     = user.is_a?(User) ? user.rol_id : user

    especificas = sin_excluir_a_la_persona(para_usuario(user), persona_id)
    base = especificas.exists? ? especificas : sin_excluir_a_la_persona(default_activa, persona_id)

    generales = sin_excluir_a_la_persona(activas.where(applies_to_all_roles: true), persona_id)
    if rol_id.present?
      excluyen_el_rol = ExpenseRule.joins(:excluded_rols).where(rols: { id: rol_id }).select(:id)
      generales = generales.where.not(id: excluyen_el_rol)
    end

    where(id: base.select(:id)).or(where(id: generales.select(:id)))
  end

  # Las reglas que aplican a UN gasto: las de la persona, menos las que
  # exceptuan ese tipo de sus limites. Devuelve un Array con los tipos ya
  # precargados, porque quien lo usa vuelve a preguntar por ellos (prohibiciones,
  # etiquetas para el agente).
  #
  # Los tipos PROHIBIDOS no filtran aqui: una regla que prohibe Representacion
  # tambien le pone sus limites a los demas gastos de la persona. Si el gasto es
  # de un tipo prohibido lo dice `prohibe_el_tipo?`.
  def self.para_gasto(user, tipo_id)
    aplicables_a(user).includes(:included_types, :excluded_types).to_a
                      .select { |regla| regla.aplica_al_tipo?(tipo_id) }
  end

  def self.sin_excluir_a_la_persona(scope, persona_id)
    return scope if persona_id.blank?

    scope.where.not(id: ExpenseRule.joins(:excluded_users).where(users: { id: persona_id }).select(:id))
  end
  private_class_method :sin_excluir_a_la_persona

  # Si los limites de la regla se revisan en un gasto de este tipo. Sin tipo
  # elegido, si: todavia no hay excepcion que aplicar.
  def aplica_al_tipo?(tipo_id)
    tipo_id = tipo_id.presence&.to_i
    !(tipo_id && excluded_type_ids.include?(tipo_id))
  end

  # Si la regla frena un gasto de este tipo por ser un tipo prohibido. Sin tipo
  # elegido, no: afirmar que un gasto sin tipo es de Representacion seria
  # inventarlo.
  def prohibe_el_tipo?(tipo_id)
    tipo_id = tipo_id.presence&.to_i
    !tipo_id.nil? && included_type_ids.include?(tipo_id)
  end

  # Prohibe si tiene tipos, y solo entonces. Mira la lista y no la columna: si
  # los tipos se borran despues desde Parametrizaciones (la FK los quita en
  # cascada), la regla deja de prohibir en vez de prohibirlo todo.
  def prohibe?
    included_type_ids.any?
  end

  # Lo que la IA busca en el comprobante. Es la unica lectura del texto para el
  # agente, para que todos los caminos (extraccion, guardado, MCP) lo lean igual.
  def texto_para_el_agente
    agent_instructions.to_s.strip
  end

  # Nombre completo para la pantalla, la auditoria y el catalogo del
  # multi-select. `names` solo no alcanza para excluir a alguien: es el nombre
  # de pila, y dos personas que se llamen igual serian indistinguibles.
  def self.nombre_de_persona(user)
    "#{user.names} #{user.last_names}".squish
  end

  # --- Auditoria -------------------------------------------------------------
  # Mismo patron que ExpenseBudget: el modelo escribe su propio HTML en
  # RegisterEdit. ORDEN OBLIGATORIO: edit_values antes que create_edit_register,
  # para que el registro de edicion se escriba con el actor ya resuelto.
  before_update  :edit_values
  after_create   :create_create_register
  before_update  :create_edit_register
  before_destroy :create_destroy_register

  # Etiquetas legibles para la auditoria y para la pantalla.
  def limite_antiguedad_label
    max_invoice_age_days.present? ? "#{max_invoice_age_days} días" : "Sin límite"
  end

  def limite_valor_label
    max_invoice_value.present? ? ExpenseBudgetService.money(max_invoice_value) : "Sin tope"
  end

  # Se dice lo que PASA, no el nombre del flag: "Obligatoria / Informativa" no
  # le sirve a quien lee la auditoria seis meses despues.
  def obligatoriedad_label
    etiqueta_obligatoriedad(mandatory)
  end

  private

  def name_unico_entre_activas
    return if name.blank? || !active

    otras = self.class.activas.where(name: name)
    otras = otras.where.not(id: id) if persisted?
    errors.add(:name, "ya existe una regla activa con ese nombre") if otras.exists?
  end

  # El indice unico parcial de la migracion es lo que lo garantiza de verdad
  # (una validacion de Rails no es atomica y dos peticiones simultaneas pasan
  # las dos). Esta validacion existe para dar un mensaje entendible en vez de
  # un PG::UniqueViolation en pantalla.
  def una_sola_default_activa
    return unless is_default && active

    otras = self.class.default_activa
    otras = otras.where.not(id: id) if persisted?
    return unless otras.exists?

    errors.add(:is_default,
               "ya existe otra regla marcada como regla por defecto; " \
               "desactívela o quítele la marca antes de asignarla aquí")
  end

  # `User.current` solo existe dentro de un request web. Los respaldos son las
  # FKs que el propio registro ya trae, para que una escritura desde consola,
  # rake o MCP tampoco reviente.
  def current_actor_id
    User.current&.id || user_id || last_user_edited_id
  end

  def edit_values
    self.last_user_edited_id = current_actor_id
  end

  def create_create_register
    escribir_register("<p><strong>(SE CREO LA SIGUIENTE REGLA DE GASTOS)</strong></p>" + cuerpo_completo, "creo")
  end

  def create_destroy_register
    escribir_register("<p><strong>(SE ELIMINO LA SIGUIENTE REGLA DE GASTOS)</strong></p>" + cuerpo_completo, "elimino")
  end

  def create_edit_register
    partes = []
    partes << segmento_edicion("Nombre", name_change[0], name_change[1])                        if name_changed?
    partes << segmento_edicion("Estado", etiqueta_estado(active_change[0]),
                               etiqueta_estado(active_change[1]))                               if active_changed?
    partes << segmento_edicion("Regla por defecto", etiqueta_si_no(is_default_change[0]),
                               etiqueta_si_no(is_default_change[1]))                            if is_default_changed?
    partes << segmento_edicion("Antigüedad máxima", etiqueta_dias(max_invoice_age_days_change[0]),
                               etiqueta_dias(max_invoice_age_days_change[1]))                   if max_invoice_age_days_changed?
    partes << segmento_edicion("Tope de valor", etiqueta_monto(max_invoice_value_change[0]),
                               etiqueta_monto(max_invoice_value_change[1]))                     if max_invoice_value_changed?
    partes << segmento_edicion("Validar duplicados", etiqueta_si_no(check_duplicates_change[0]),
                               etiqueta_si_no(check_duplicates_change[1]))                      if check_duplicates_changed?
    # AFLOJAR O ENDURECER UNA REGLA TIENE QUE QUEDAR EN LA AUDITORIA: es el
    # cambio de esta pantalla con mas consecuencias —deja de rechazarse un gasto
    # que antes se rechazaba— y sin este segmento no habria forma de saber quien
    # lo hizo ni cuando.
    partes << segmento_edicion("Al incumplirse", etiqueta_obligatoriedad(mandatory_change[0]),
                               etiqueta_obligatoriedad(mandatory_change[1]))                    if mandatory_changed?
    partes << segmento_edicion("Instrucciones para el agente", agent_instructions_change[0],
                               agent_instructions_change[1])                                    if agent_instructions_changed?
    partes << segmento_edicion("Prohíbe el gasto", etiqueta_si_no(prohibits_expense_change[0]),
                               etiqueta_si_no(prohibits_expense_change[1]))                     if prohibits_expense_changed?
    partes << segmento_edicion("Aplica a", etiqueta_modo_roles(applies_to_all_roles_change[0]),
                               etiqueta_modo_roles(applies_to_all_roles_change[1]))             if applies_to_all_roles_changed?
    partes << segmento_edicion("Observaciones", observations_change[0], observations_change[1]) if observations_changed?

    return if partes.empty?

    escribir_register("<p><strong>(SE EDITO LA SIGUIENTE REGLA DE GASTOS)</strong></p>" + partes.join, nil)
  end

  def cuerpo_completo
    "<p>Nombre: <b>#{name}</b></p>" \
      "<p>Observaciones: <b>#{observations.presence || "Ninguna"}</b></p>" \
      "<p>Estado: <b>#{etiqueta_estado(active)}</b></p>" \
      "<p>Regla por defecto: <b>#{etiqueta_si_no(is_default)}</b></p>" \
      "<p>Antigüedad máxima: <b>#{limite_antiguedad_label}</b></p>" \
      "<p>Tope de valor: <b>#{limite_valor_label}</b></p>" \
      "<p>Validar duplicados: <b>#{etiqueta_si_no(check_duplicates)}</b></p>" \
      "<p>Al incumplirse: <b>#{obligatoriedad_label}</b></p>" \
      "<p>Prohíbe el gasto: <b>#{etiqueta_si_no(prohibits_expense)}</b></p>" \
      "<p>Aplica a: <b>#{alcance_por_rol_label}</b></p>" \
      "<p>Personas excluidas: <b>#{excluded_users.map { |u| self.class.nombre_de_persona(u) }.sort.join(", ").presence || "Ninguna"}</b></p>" \
      "<p>Tipos que no se pueden registrar: <b>#{nombres(included_types).presence || "Ninguno"}</b></p>" \
      "<p>Los límites no se revisan en: <b>#{nombres(excluded_types).presence || "Ninguno"}</b></p>"
  end

  def alcance_por_rol_label
    if applies_to_all_roles
      excepto = nombres(excluded_rols)
      excepto.present? ? "Todos los roles, excepto #{excepto}" : "Todos los roles"
    else
      nombres(rols).presence || "Ningun rol asignado"
    end
  end

  def nombres(registros)
    registros.map { |r| r.name.to_s.squish }.sort.join(", ")
  end

  def prohibir_si_tiene_tipos
    self.prohibits_expense = included_types.any?
  end

  def tipos_sin_cruce
    cruzados = included_types.map(&:id) & excluded_types.map(&:id)
    return if cruzados.empty?

    nombres_cruzados = included_types.select { |t| cruzados.include?(t.id) }.map(&:name).join(", ")
    errors.add(:excluded_types,
               "un tipo no puede estar prohibido y a la vez exceptuado de los límites: #{nombres_cruzados}")
  end

  # La regla por defecto aplica a quien NO tiene reglas; una de "Todos los
  # roles" aplica a todos SIEMPRE. Las dos marcas juntas no dicen nada coherente
  # y la combinacion produciria una regla que se aplica dos veces.
  def por_defecto_no_es_para_todos
    return unless is_default && applies_to_all_roles

    errors.add(:is_default,
               "una regla para todos los roles ya aplica a todos; no puede ser además " \
               "la regla por defecto")
  end

  def segmento_edicion(label, anterior, nuevo)
    "<p>#{label}: <b class='color-true'>#{nuevo}</b> / <b class='color-false'>#{anterior}</b></p>"
  end

  def etiqueta_estado(valor) = valor ? "Activa" : "Inactiva"
  def etiqueta_modo_roles(valor) = valor ? "Todos los roles, excepto los excluidos" : "Solo los roles elegidos"
  def etiqueta_si_no(valor)  = valor ? "Sí" : "No"
  def etiqueta_obligatoriedad(valor) = valor ? "Frena la creación del gasto" : "Deja crear y avisa"
  def etiqueta_dias(valor)   = valor.present? ? "#{valor} días" : "Sin límite"
  def etiqueta_monto(valor)  = valor.present? ? ExpenseBudgetService.money(valor) : "Sin tope"

  def escribir_register(descripcion, type_edit)
    actor_id = current_actor_id
    # `RegisterEdit belongs_to :user` es requerido: sin actor, crear el registro
    # reventaria y se llevaria por delante el guardado de la regla. Se prefiere
    # perder la auditoria antes que perder el dato.
    return if actor_id.nil?

    atributos = {
      user_id: actor_id,
      register_user_id: actor_id,
      state: "pending",
      date_update: Time.now,
      module: "Reglas de gastos",
      description: descripcion
    }
    atributos[:type_edit] = type_edit unless type_edit.nil?

    RegisterEdit.create(atributos)
  end
end

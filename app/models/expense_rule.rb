# == Schema Information
#
# Table name: expense_rules
#
#  id                   :bigint           not null, primary key
#  active               :boolean          default(TRUE), not null
#  agent_instructions   :text
#  check_duplicates     :boolean          default(TRUE), not null
#  is_default           :boolean          default(FALSE), not null
#  mandatory            :boolean          default(TRUE), not null
#  max_invoice_age_days :integer
#  max_invoice_value    :decimal(15, 2)
#  name                 :string           not null
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
#   * SEMANTICA (agent_instructions): texto libre que este modelo NO evalua. Se
#     expone para que lo aplique el agente de Taimes, que si tiene criterio.
#
# Mover una regla determinista al prompt del agente rompe la simetria entre
# canales en silencio: el gasto por la web deja de validarse y nadie se entera.
#
# `mandatory` NO ES NI UNA COSA NI LA OTRA: no es un limite que se evalue, es la
# CONSECUENCIA de incumplir los limites de esta regla. `true` frena la creacion
# del gasto (web y movil); `false` la deja pasar, anota la violacion y baja el
# gasto a "sin aprobar" con el motivo. Aplica solo a los limites deterministas:
# `agent_instructions` las juzga el agente y este flag no lo alcanza.
class ExpenseRule < ApplicationRecord
  # POR ROL Y NO POR USUARIO (2026-09-10). Mantener la lista persona por persona
  # es trabajo que nadie hace: cada usuario nuevo hay que acordarse de agregarlo,
  # y olvidarlo no produce ningun error —`aplicables_a` cae a la regla por
  # defecto—, asi que el olvido no se nota hasta que alguien registra un gasto
  # que debia haberse rechazado. El rol ya se asigna al crear el usuario.
  has_and_belongs_to_many :rols
  belongs_to :user,             optional: true   # quien la creo
  belongs_to :last_user_edited, class_name: "User", optional: true

  validates :name, presence: true
  # Unico ENTRE ACTIVAS y no en toda la tabla: desactivar una regla es la forma
  # de archivarla, y el nombre tiene que poder reutilizarse despues.
  validate  :name_unico_entre_activas
  validates :max_invoice_age_days, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validates :max_invoice_value,    numericality: { greater_than: 0 }, allow_nil: true
  validates :active, :is_default, :check_duplicates, :mandatory, inclusion: { in: [true, false] }
  validate  :una_sola_default_activa

  scope :activas, -> { where(active: true) }
  scope :default_activa, -> { activas.where(is_default: true) }
  # Recibe un User (lo normal) o un rol_id suelto.
  scope :para_usuario, ->(user) {
    rol_id = user.is_a?(User) ? user.rol_id : user
    return none if rol_id.blank?

    activas.joins(:rols).where(rols: { id: rol_id })
  }

  # RESOLUCION DE QUE REGLA APLICA A QUIEN. Es la parte donde se cometen los
  # errores, asi que vive en un solo metodo:
  #
  #   reglas activas asignadas explicitamente al usuario
  #   |- si hay al menos una -> esas
  #   \- si no hay ninguna   -> la regla default activa (si existe)
  #                             \- si tampoco existe -> sin restricciones
  #
  # OJO: "sin usuarios asignados" NO significa "todos", significa "ninguno".
  # Para "todos" esta el switch de regla por defecto. Es la confusion obvia de
  # la pantalla y por eso el metodo no tiene ningun fallback a `all`.
  def self.aplicables_a(user)
    return none if user.blank?

    asignadas = para_usuario(user).distinct
    return asignadas if asignadas.exists?

    default_activa
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

    return if partes.empty?

    escribir_register("<p><strong>(SE EDITO LA SIGUIENTE REGLA DE GASTOS)</strong></p>" + partes.join, nil)
  end

  def cuerpo_completo
    "<p>Nombre: <b>#{name}</b></p>" \
      "<p>Estado: <b>#{etiqueta_estado(active)}</b></p>" \
      "<p>Regla por defecto: <b>#{etiqueta_si_no(is_default)}</b></p>" \
      "<p>Antigüedad máxima: <b>#{limite_antiguedad_label}</b></p>" \
      "<p>Tope de valor: <b>#{limite_valor_label}</b></p>" \
      "<p>Validar duplicados: <b>#{etiqueta_si_no(check_duplicates)}</b></p>" \
      "<p>Al incumplirse: <b>#{obligatoriedad_label}</b></p>" \
      "<p>Aplica a: <b>#{rols.map(&:name).sort.join(", ").presence || "Ningun rol asignado"}</b></p>"
  end

  def segmento_edicion(label, anterior, nuevo)
    "<p>#{label}: <b class='color-true'>#{nuevo}</b> / <b class='color-false'>#{anterior}</b></p>"
  end

  def etiqueta_estado(valor) = valor ? "Activa" : "Inactiva"
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

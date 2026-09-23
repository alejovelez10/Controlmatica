# == Schema Information
#
# Table name: expense_budgets
#
#  id                  :bigint           not null, primary key
#  active              :boolean          default(TRUE), not null
#  amount              :decimal(15, 2)   default(0.0), not null
#  notes               :text
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  cost_center_id      :integer          not null
#  created_by_id       :integer
#  last_user_edited_id :integer
#  user_id             :integer          not null
#
# Indexes
#
#  index_expense_budgets_on_center_user_active  (cost_center_id,user_id,active)
#  index_expense_budgets_on_cost_center_id      (cost_center_id)
#  index_expense_budgets_on_user_id             (user_id)
#

# Partida presupuestal: cuanta plata de viaticos tiene asignada UNA persona en
# UN centro de costos.
#
# `user` es el BENEFICIARIO, no quien la creo. Confundirlos es el error mas caro
# posible aqui: dejaria a cada jefe con el presupuesto de todo su equipo.
# Quien la creo va en `created_by`.
#
# No hay indice unico sobre (cost_center_id, user_id): un par puede tener varias
# partidas y el cupo se controla POR AGREGADO. Esa decision tiene dos
# consecuencias que atraviesan todo el paquete: el tope se valida sumando las
# partidas activas del CENTRO (no del par), y `spent_amount`/`available_amount`
# de una fila son magnitudes DEL PAR, no de la fila (no existe imputacion
# parcial entre partidas, asi que prorratear seria inventar un numero).
class ExpenseBudget < ApplicationRecord
  belongs_to :cost_center
  belongs_to :user                                        # BENEFICIARIO, no creador
  belongs_to :created_by,       class_name: "User", optional: true
  belongs_to :last_user_edited, class_name: "User", optional: true

  # :nullify y no :destroy. Usa `update_all`, asi que NO dispara callbacks de
  # ReportExpense: es exactamente lo que queremos. Con :destroy borrariamos
  # gastos reales; con un update normal generariamos un RegisterEdit fantasma
  # por cada gasto y `edit_values` pisaria el `last_user_edited_id` ajeno.
  has_many :report_expenses, dependent: :nullify

  validates :amount,  presence: true, numericality: { greater_than: 0 }
  # 1000 caracteres es un limite asumido: la columna es `text` y no hay limite
  # de negocio definido.
  validates :notes,   length: { maximum: 1000 }, allow_blank: true
  validates :active,  inclusion: { in: [true, false] }
  validate  :within_cost_center_cap

  scope :activas,          -> { where(active: true) }
  scope :para,             ->(cost_center_id, user_id) { where(cost_center_id: cost_center_id, user_id: user_id) }
  # El desempate por id NO es cosmetico: dos partidas creadas en el mismo
  # milisegundo darian un orden no determinista y el test de "imputa a la mas
  # antigua" seria intermitente.
  scope :antiguas_primero, -> { order(created_at: :asc, id: :asc) }

  # --- Auditoria -------------------------------------------------------------
  # ORDEN OBLIGATORIO: edit_values antes que create_edit_register, para que el
  # registro de edicion se escriba con el actor ya resuelto.
  before_update  :edit_values
  after_create   :create_create_register
  before_update  :create_edit_register
  before_destroy :create_destroy_register

  # --- Montos calculados -----------------------------------------------------
  # Los writers NO son opcionales: el controller del paquete 07 hace
  # `preload_amounts!` inyectando los montos ya calculados en lote. Sin ellos
  # revienta con NoMethodError y la tabla de partidas cae en N+1.
  attr_writer :spent_amount, :available_amount

  # Mensaje de la ANULACION, en memoria y sin columna detras. Lo escribe
  # ExpenseBudgetService.anular_budget! ANTES de guardar y sirve para dos cosas:
  # la auditoria distingue asi una anulacion de una edicion cualquiera (un
  # recorte parcial se leeria si no como un simple cambio de monto) y el
  # controller lo devuelve como mensaje de exito de la operacion.
  attr_accessor :mensaje_anulacion

  # SUM(amount) de las partidas ACTIVAS del par (centro, beneficiario).
  def assigned_amount
    @assigned_amount ||= totales_del_par[:assigned]
  end

  # Gastado del PAR. La memoizacion respeta el valor inyectado por el preload.
  def spent_amount
    @spent_amount ||= totales_del_par[:spent]
  end

  def available_amount
    @available_amount ||= (assigned_amount - spent_amount).round(2)
  end

  # Regla del tope, en una sola implementacion con dos puntos de entrada (esta
  # validacion y `ExpenseBudgetService.validate_cap!`).
  #
  # Devuelve nil si no hay violacion, o el mensaje de error (String) si la hay.
  # NO abre transaccion ni toma lock: el lock lo pone quien la llama.
  #
  # EL TOPE ES POR CENTRO, NO POR PAR: suma las partidas activas de TODOS los
  # beneficiarios del centro contra `cost_centers.viatic_value`.
  def self.cap_violation_for(cost_center:, amount:, active:, exclude_id: nil)
    # Desactivar o anular una partida NUNCA puede fallar por tope, ni siquiera
    # en un centro sin viaticos cotizados.
    return nil unless active

    monto = amount.to_d.round(2)
    return nil if monto <= 0

    tope = cost_center&.viatic_value.to_d.round(2)
    return "El centro de costos no tiene valor de viáticos cotizado; no es posible asignar partidas" if tope <= 0

    # LOS GASTOS SIN ACEPTAR SE RESERVAN DEL TOPE (2026-09-22). Un gasto en
    # "Creado" todavia no descuenta cupo (`consumidores` mira `is_acepted`), asi
    # que sin esto se podria repartir en partidas plata que ya esta gastada y el
    # centro se pasaria del cotizado en cuanto alguien acepte esos gastos.
    pendientes = ExpenseBudgetService.pending_for_center(cost_center.id)
    tope_efectivo = (tope - pendientes).round(2)

    scope = activas.where(cost_center_id: cost_center.id)
    # TRAMPA: `where.not(id: nil)` no filtra nada, filtra TODO (en SQL
    # `id <> NULL` es NULL, o sea falso para toda fila). Con una partida nueva
    # exclude_id es nil y el where.not devolveria cero partidas, dejando pasar
    # cualquier monto.
    scope = scope.where.not(id: exclude_id) if exclude_id.present?
    suma_otras = scope.sum(:amount)

    nueva_suma = suma_otras + monto
    return nil if nueva_suma <= tope_efectivo

    # ESCAPE PARA NO DEJAR UNA PARTIDA ATRAPADA. Si los gastos pendientes bajan
    # el tope efectivo por debajo de lo ya repartido, sin esto no se podria ni
    # siquiera BAJAR una partida existente: la validacion rechazaria tambien el
    # monto nuevo, mas pequeno, y el centro quedaria congelado. Solo deja pasar
    # lo que no aumenta el total ya asignado; subir sigue bloqueado.
    if exclude_id.present?
      anterior = find_by(id: exclude_id)
      previo = (anterior&.active ? anterior.amount.to_d.round(2) : BigDecimal(0))
      return nil if nueva_suma <= suma_otras + previo
    end

    disponible = ExpenseBudgetService.money([tope_efectivo - suma_otras, 0].max)

    # Dos mensajes distintos porque son dos motivos distintos: pasarse del
    # cotizado, o chocar contra lo que los gastos sin aceptar tienen reservado.
    # Con un solo texto, el usuario que ve "supera el valor de viáticos" con el
    # cotizado a la vista y sin pasarse de el no entiende que lo bloqueo.
    if pendientes > 0
      return "La suma de las partidas (#{ExpenseBudgetService.money(nueva_suma)}) supera lo que se puede " \
             "asignar en el centro de costos: del valor de viáticos (#{ExpenseBudgetService.money(tope)}) " \
             "se reservan #{ExpenseBudgetService.money(pendientes)} en gastos creados sin aceptar. " \
             "Disponible para asignar: #{disponible}"
    end

    "La suma de las partidas (#{ExpenseBudgetService.money(nueva_suma)}) supera el valor de viáticos " \
      "del centro de costos (#{ExpenseBudgetService.money(tope)}). " \
      "Disponible para asignar: #{disponible}"
  end

  private

  def totales_del_par
    @totales_del_par ||= ExpenseBudgetService.available_for(cost_center_id: cost_center_id, user_id: user_id)
  end

  # La regla vive en el MODELO y no solo en el servicio a proposito: un
  # `ExpenseBudget.create!` desde consola, rake, seed o un controller futuro no
  # puede saltarse el tope. El servicio aporta el lock (serializacion), no la
  # regla.
  def within_cost_center_cap
    return if cost_center.blank?

    msg = self.class.cap_violation_for(cost_center: cost_center, amount: amount,
                                       active: active, exclude_id: (persisted? ? id : nil))
    errors.add(:amount, msg) if msg
  end

  # `User.current` solo existe dentro de un request web. Los tres respaldos son
  # FKs que el propio registro ya trae, asi que una escritura desde consola o
  # desde una rake task tampoco revienta.
  def current_actor_id
    User.current&.id || created_by_id || last_user_edited_id || user_id
  end

  def edit_values
    self.last_user_edited_id = current_actor_id
  end

  def create_create_register
    escribir_register("<p><strong>(SE CREO LA SIGUIENTE PARTIDA)</strong></p>" + cuerpo_completo, "creo")
  end

  def create_destroy_register
    escribir_register("<p><strong>(SE ELIMINO LA SIGUIENTE PARTIDA)</strong></p>" + cuerpo_completo, "elimino")
  end

  def create_edit_register
    partes = []
    # `*_change` devuelve [anterior, nuevo]. En codigo nuevo [1] es el nuevo y
    # va en color-true. La auditoria legada de ReportExpense los usa de forma
    # inconsistente; aqui no se replica esa rareza.
    partes << segmento_edicion("Valor", ExpenseBudgetService.money(amount_change[0]),
                               ExpenseBudgetService.money(amount_change[1]))               if amount_changed?
    partes << segmento_edicion("Notas", notes_change[0], notes_change[1])                  if notes_changed?
    partes << segmento_edicion("Estado", etiqueta_estado(active_change[0]),
                               etiqueta_estado(active_change[1]))                          if active_changed?

    # `partes.empty?` en vez del umbral magico de 59 de ReportExpense: ese numero
    # existe alli porque el encabezado mide exactamente 59 caracteres. En codigo
    # nuevo la condicion se escribe explicita.
    return if partes.empty?

    # Encabezado propio para la anulacion. Sin el, el recorte parcial (el caso en
    # que la partida se queda ACTIVA con el monto bajado a lo gastado) quedaria
    # en el historial como un cambio de valor cualquiera y nadie podria
    # reconstruir que alguien anulo esa partida.
    #
    # `type_edit` sigue en nil (default "edito" de la columna) a proposito: las
    # pantallas de auditoria filtran por esos tres valores historicos y meter uno
    # nuevo las dejaria sin mostrar el registro.
    if mensaje_anulacion.present?
      return escribir_register("<p><strong>(SE ANULO LA SIGUIENTE PARTIDA)</strong></p>" +
                               partes.join + "<p>Detalle: <b>#{mensaje_anulacion}</b></p>", nil)
    end

    escribir_register("<p><strong>(SE EDITO LA SIGUIENTE PARTIDA)</strong></p>" + partes.join, nil)
  end

  def cuerpo_completo
    "<p>Centro de costo: <b>#{cost_center&.code}</b></p>" \
      "<p>Beneficiario: <b>#{user&.names}</b></p>" \
      "<p>Valor: <b>#{ExpenseBudgetService.money(amount)}</b></p>" \
      "<p>Notas: <b>#{notes}</b></p>" \
      "<p>Estado: <b>#{etiqueta_estado(active)}</b></p>"
  end

  def segmento_edicion(label, anterior, nuevo)
    "<p>#{label}: <b class='color-true'>#{nuevo}</b> / <b class='color-false'>#{anterior}</b></p>"
  end

  def etiqueta_estado(valor)
    valor ? "Activa" : "Inactiva"
  end

  def escribir_register(descripcion, type_edit)
    actor_id = current_actor_id
    # `RegisterEdit belongs_to :user` es requerido: sin actor, crear el registro
    # reventaria y se llevaria por delante el guardado de la partida. Se prefiere
    # perder la auditoria antes que perder el dato.
    return if actor_id.nil?

    atributos = {
      user_id: actor_id,
      # El BENEFICIARIO. `register_user` es class_name: "User", asi que el
      # `register_user_id: self.id` de ReportExpense es un bug preexistente que
      # aqui no se replica.
      register_user_id: user_id,
      state: "pending",
      date_update: Time.now,
      module: "Presupuesto",
      description: descripcion
    }
    # En edicion no se pasa type_edit, para que quede el default "edito" de la
    # columna.
    atributos[:type_edit] = type_edit unless type_edit.nil?

    RegisterEdit.create(atributos)
  end
end

# CRUD de reglas de gastos (paquete 14, tarea 5).
#
# Mismo patron de autorizacion que ExpenseBudgetsController: permiso de modulo
# leido con `is_admin? || has_menu_permission?`, 403 CON CUERPO JSON y errores de
# validacion con HTTP 200 + `type: "error"` (el patron viejo de esta app, que el
# frontend discrimina por `type` y no por el status).
#
# NO hay gate de propiedad como el del dueno del centro: una regla de gasto es
# politica de la empresa, no de un proyecto. Quien la administra es quien tiene
# el permiso, y punto.
class ExpenseRulesController < ApplicationController
  before_action :authenticate_user!
  before_action :require_rules_module!, only: [:index]
  before_action :set_expense_rule, only: [:update, :destroy]
  include ApplicationHelper

  MODULO = "Reglas de gastos".freeze

  SORT_COLUMNS = %w[name active is_default max_invoice_age_days max_invoice_value
                    created_at updated_at].freeze

  # La PANTALLA (tarea 6). Solo monta el pack de React y le pasa que puede hacer
  # quien la abre; los datos los pide el propio pack a `get_expense_rules`.
  #
  # `@estados` viaja como prop y no se recalcula en el cliente a proposito: los
  # permisos se resuelven UNA vez en el servidor, que es el unico que manda. Los
  # botones que oculta son cortesia visual; el gate de verdad esta en cada
  # accion de este mismo controller.
  def index
    @estados = {
      create: rule_permission?("Crear"),
      edit: rule_permission?("Editar"),
      delete: rule_permission?("Eliminar")
    }

    respond_to do |format|
      format.html
      # Mismo `@estados` como JSON: deja verificar los permisos de la pantalla
      # sin ejecutar React, igual que hace la pantalla de Contabilidad.
      format.json { render json: { estados: @estados } }
    end
  end

  # Listado completo. No se pagina en el servidor: son decenas de reglas como
  # mucho (una politica por perfil de empleado), y la pantalla necesita el
  # conjunto entero para avisar de la regla por defecto.
  def get_expense_rules
    return deny! unless rule_permission?

    scope = ExpenseRule.includes(:rols, :user, :last_user_edited)
    scope = scope.where(active: params[:only_active] == "true") if params[:only_active].present?

    if params[:q].present?
      term = "%#{params[:q].to_s.downcase.strip}%"
      scope = scope.where("LOWER(expense_rules.name) LIKE :t OR LOWER(expense_rules.agent_instructions) LIKE :t", t: term)
    end

    scope = if SORT_COLUMNS.include?(params[:sort])
        scope.order(Arel.sql("expense_rules.#{params[:sort]} #{sort_dir}"))
      else
        scope.order(name: :asc)
      end

    render json: {
      data: ActiveModelSerializers::SerializableResource.new(scope, each_serializer: ExpenseRuleSerializer),
      total: scope.length
    }
  end

  # Los limites YA RESUELTOS de un usuario. Lo consume el formulario de gastos
  # (para avisar antes de guardar) y la tool MCP del paquete 11 (para que el
  # agente sepa las reglas antes de conversar).
  #
  # Devuelve lo determinista y lo semantico por separado a proposito: quien lo
  # consuma no tiene que adivinar cual de los dos evalua el servidor.
  # Evalua las reglas contra un gasto EN CURSO, sin guardarlo.
  #
  # POR QUE EXISTE: el formulario tiene que poder avisar en el momento en que se
  # adjunta el comprobante, no al pulsar Guardar. Hasta ahora la web solo podia
  # pedir los LIMITES (`get_expense_rules_for_user`) y evaluarlos por su cuenta,
  # y eso significa reimplementar las tres reglas en JavaScript: la de duplicados
  # ni siquiera es evaluable en el cliente, porque necesita consultar la base.
  #
  # DELEGA EN ExpenseRuleService, que es el mismo motor que corre en la
  # validacion del modelo y en la tool del agente. Si esta accion evaluara por su
  # cuenta, la pantalla podria decir "todo bien" y el Guardar rechazar.
  #
  # Es SOLO LECTURA: no crea, no guarda y no escribe auditoria.
  def validate_candidate
    responsable = User.find_by(id: params[:user_invoice_id].presence || current_user.id)
    return validation_error(["El usuario no existe"]) if responsable.nil?

    candidato = ReportExpense.new(
      user_invoice_id: responsable.id,
      cost_center_id: params[:cost_center_id],
      invoice_date: params[:invoice_date],
      invoice_number: params[:invoice_number],
      identification: params[:identification],
      invoice_value: params[:invoice_value].to_f,
      invoice_tax: params[:invoice_tax].to_f,
      invoice_total: params[:invoice_total].to_f
    )
    # `id` para que la regla de duplicados no se encuentre a si misma al editar.
    candidato.id = params[:id] if params[:id].present?

    resultado = ExpenseRuleService.validate(candidato, user: responsable)

    render json: {
      ok: resultado.value[:ok],
      violations: resultado.value[:violations],
      applied_rules: resultado.value[:applied_rules]
    }
  end

  def get_expense_rules_for_user
    user = User.find_by(id: params[:user_id].presence || current_user.id)
    return validation_error(["El usuario no existe"]) if user.nil?

    limites = ExpenseRuleService.limits_for(user)

    render json: {
      user_id: user.id,
      applied_rules: ExpenseRule.aplicables_a(user).map(&:name),
      max_invoice_age_days: limites[:max_invoice_age_days],
      max_invoice_value: limites[:max_invoice_value],
      check_duplicates: limites[:check_duplicates],
      agent_instructions: limites[:agent_instructions]
    }
  end

  def create
    return deny! unless rule_permission?("Crear")

    rule = ExpenseRule.new(expense_rule_params)
    rule.user_id = current_user.id
    rule.rols = roles_del_body if params.key?(:rol_ids)

    if guardar(rule)
      render json: { success: "¡La regla fue creada con exito!", type: "success",
                     register: ActiveModelSerializers::SerializableResource.new(rule, serializer: ExpenseRuleSerializer) }
    else
      validation_error(rule.errors.full_messages)
    end
  end

  def update
    return deny! unless rule_permission?("Editar")

    @expense_rule.assign_attributes(expense_rule_params)
    # `params.key?` y no `params[:rol_ids].present?`: mandar la lista VACIA es
    # una operacion legitima ("esta regla ya no aplica a nadie") y con
    # `.present?` seria indistinguible de no mandar el campo.
    @expense_rule.rols = roles_del_body if params.key?(:rol_ids)

    if guardar(@expense_rule)
      render json: { success: "¡La regla fue actualizada con exito!", type: "success",
                     register: ActiveModelSerializers::SerializableResource.new(@expense_rule, serializer: ExpenseRuleSerializer) }
    else
      validation_error(@expense_rule.errors.full_messages)
    end
  end

  def destroy
    return deny! unless rule_permission?("Eliminar")

    if @expense_rule.destroy
      # `type: "delete"` y no "success": es lo que el frontend usa para sacar la
      # fila de la tabla sin recargar la pagina.
      render json: { success: "¡La regla fue eliminada!", type: "delete" }
    else
      validation_error(@expense_rule.errors.full_messages)
    end
  end

  private

  def is_admin?
    @_is_admin ||= current_user.rol.name == "Administrador"
  end

  def rule_permission?(action = "Ingreso al modulo")
    is_admin? || has_menu_permission?(MODULO, action)
  end

  def deny!(message = "No tiene permiso para realizar esta acción")
    render json: { type: "error", message: [message] }, status: :forbidden
  end

  # Gate de la PANTALLA. No responde 403 con JSON como los endpoints: quien
  # llega aqui es un navegador pidiendo HTML, y un cuerpo JSON en pantalla es
  # peor experiencia que volver al inicio con el aviso. Mismo criterio que la
  # pantalla de Contabilidad del paquete 06.
  def require_rules_module!
    return if rule_permission?

    respond_to do |format|
      format.html { redirect_to root_path, alert: "No tiene permiso para ingresar al módulo de Reglas de gastos" }
      format.json { deny! }
    end
  end

  def validation_error(messages)
    render json: { success: "¡Ocurrió un error!", type: "error", message: Array(messages) }
  end

  def set_expense_rule
    @expense_rule = ExpenseRule.find(params[:id])
  end

  def sort_dir
    params[:dir] == "asc" ? "ASC" : "DESC"
  end

  # El indice unico parcial de `is_default` puede disparar antes que la
  # validacion cuando dos peticiones llegan a la vez. Sin este rescue el usuario
  # veria un 500 con el SQL de Postgres en la pantalla.
  def guardar(rule)
    rule.save
  rescue ActiveRecord::RecordNotUnique
    rule.errors.add(:is_default, "ya existe otra regla marcada como regla por defecto")
    false
  end

  # Un multi-select vacio significa "ninguno", NO "todos". Para "todos" esta el
  # switch de regla por defecto. Es la confusion obvia de la pantalla, y aqui se
  # respeta literalmente: lista vacia => la regla no aplica a nadie.
  def roles_del_body
    ids = params.permit(rol_ids: [])[:rol_ids] || []
    Rol.where(id: ids)
  end

  # `user_id` y `last_user_edited_id` NO estan y no pueden estar: el creador lo
  # pone el servidor a partir de la sesion y el editor lo escribe el callback del
  # modelo. Permitirlos dejaria atribuirle a otro una regla propia.
  def expense_rule_params
    params.permit(:name, :active, :is_default, :max_invoice_age_days,
                  :max_invoice_value, :check_duplicates, :agent_instructions)
  end
end

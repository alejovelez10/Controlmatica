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
  before_action :set_expense_rule, only: [:update, :destroy]
  include ApplicationHelper

  MODULO = "Reglas de gastos".freeze

  SORT_COLUMNS = %w[name active is_default max_invoice_age_days max_invoice_value
                    created_at updated_at].freeze

  # Listado completo. No se pagina en el servidor: son decenas de reglas como
  # mucho (una politica por perfil de empleado), y la pantalla necesita el
  # conjunto entero para avisar de la regla por defecto.
  def get_expense_rules
    return deny! unless rule_permission?

    scope = ExpenseRule.includes(:users, :user, :last_user_edited)
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
    rule.users = usuarios_del_body if params.key?(:user_ids)

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
    # `params.key?` y no `params[:user_ids].present?`: mandar la lista VACIA es
    # una operacion legitima ("esta regla ya no aplica a nadie") y con
    # `.present?` seria indistinguible de no mandar el campo.
    @expense_rule.users = usuarios_del_body if params.key?(:user_ids)

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
  def usuarios_del_body
    ids = params.permit(user_ids: [])[:user_ids] || []
    User.where(id: ids)
  end

  # `user_id` y `last_user_edited_id` NO estan y no pueden estar: el creador lo
  # pone el servidor a partir de la sesion y el editor lo escribe el callback del
  # modelo. Permitirlos dejaria atribuirle a otro una regla propia.
  def expense_rule_params
    params.permit(:name, :active, :is_default, :max_invoice_age_days,
                  :max_invoice_value, :check_duplicates, :agent_instructions)
  end
end

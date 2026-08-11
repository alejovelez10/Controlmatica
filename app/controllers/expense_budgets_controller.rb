# API de partidas presupuestales (paquete 07). Contrato en 00-ARQUITECTURA.md A.1
# a A.7.
#
# ESTE CONTROLLER NO HACE ARITMETICA NI ABRE TRANSACCIONES. Toda escritura pasa
# por ExpenseBudgetService, que es el unico que toma el `SELECT ... FOR UPDATE`
# sobre el centro de costos (00-ARQUITECTURA.md 4.2). Aqui solo se traduce el
# `Result` del servicio a JSON. Si algun dia aparece un `ExpenseBudget.create`
# suelto en este archivo, dos peticiones simultaneas podran superar el tope de
# viaticos del centro y nada lo detectara.
#
# AUTORIZACION EN DOS CAPAS, y las dos son necesarias:
#   1. Permiso del modulo "Presupuesto" (Ingreso al modulo / Crear / Editar /
#      Eliminar), que es lo que administra el area de sistemas.
#   2. Regla de negocio: el DUENO del centro (`cost_centers.user_owner_id`)
#      administra las partidas de SU centro aunque no tenga "Ver todos".
# Sin la segunda, un jefe de proyecto necesitaria permiso global para repartir el
# presupuesto de su propio centro; sin la primera, cualquiera con un centro a su
# nombre entraria al modulo.
class ExpenseBudgetsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_expense_budget, only: [:update, :destroy]
  include ApplicationHelper

  # Columnas por las que se puede ordenar el listado. Es una ALLOWLIST y no una
  # denylist porque `params[:sort]` termina dentro de un `Arel.sql`, que no
  # escapa nada: cualquier cosa fuera de esta lista cae al orden por defecto.
  SORT_COLUMNS = %w[amount created_at updated_at active].freeze

  # Mensaje del 403 por propiedad del centro. Es distinto del 403 por falta de
  # permiso a proposito: al usuario le sirve saber que el problema es el centro y
  # no su rol.
  MENSAJE_NO_ES_DUENO = "Solo el responsable del centro de costos puede administrar sus partidas".freeze

  # A.1 — listado de partidas de UN centro de costos.
  #
  # No existe `GET /expense_budgets` (index) a proposito: una partida no tiene
  # sentido fuera de su centro, y un listado global seria una fuga de datos entre
  # proyectos.
  def get_expense_budgets
    cost_center = CostCenter.find_by(id: params[:cost_center_id])
    # ORDEN DE LOS GUARDS (Discrepancia 5 del paquete 07): primero el permiso y
    # despues la existencia del centro. Al reves, un usuario sin permiso podria
    # usar el endpoint como oraculo para averiguar que centros existen.
    return deny! unless budget_permission?
    return validation_error(["El centro de costos no existe"]) if cost_center.nil?

    scope = ExpenseBudget.includes(:user, :created_by, :last_user_edited)
                         .where(cost_center_id: cost_center.id)

    scope = scope.where(user_id: current_user.id) unless owner_or_show_all?(cost_center)

    # `.present?` y no `.nil?`: `only_active=false` (el caso "muestrame solo las
    # anuladas") es present? y tiene que filtrar.
    scope = scope.where(active: params[:only_active] == "true") if params[:only_active].present?

    # EL ALIAS `beneficiaries` ES INDISPENSABLE. ExpenseBudget tiene TRES
    # asociaciones a `users` (user, created_by, last_user_edited): con
    # `joins(:user)` + `includes(...)` Rails aliasea las tablas como le conviene y
    # `ORDER BY users.names` termina ordenando por el creador o reventando con
    # PG::UndefinedTable. Con un join literal el nombre de la tabla es nuestro.
    #
    # Y la bandera evita aplicarlo dos veces (una por `q` y otra por `sort`), que
    # revienta con PG::DuplicateAlias.
    needs_user_join = params[:q].present? || params[:sort] == "user_name"
    if needs_user_join
      scope = scope.joins("INNER JOIN users AS beneficiaries ON beneficiaries.id = expense_budgets.user_id")
    end

    if params[:q].present?
      term = "%#{params[:q].to_s.downcase.strip}%"
      scope = scope.where("LOWER(expense_budgets.notes) LIKE :t OR LOWER(beneficiaries.names) LIKE :t", t: term)
    end

    # El total se cuenta DESPUES de filtrar y ANTES de paginar: es el numero que
    # el paginador del frontend usa para saber cuantas paginas hay.
    total = scope.count

    scope = if SORT_COLUMNS.include?(params[:sort])
        scope.order(Arel.sql("expense_budgets.#{params[:sort]} #{sort_dir}"))
      elsif params[:sort] == "user_name"
        scope.order(Arel.sql("beneficiaries.names #{sort_dir}"))
      else
        scope.order(created_at: :desc)
      end

    budgets = scope.paginate(page: params[:page], per_page: page_size(50))
    preload_amounts!(budgets)

    render json: {
      data: ActiveModelSerializers::SerializableResource.new(budgets, each_serializer: ExpenseBudgetSerializer),
      total: total
    }
  end

  # A.3 — resumen del centro para el tablero de presupuesto.
  def get_expense_budget_summary
    cost_center = CostCenter.find_by(id: params[:cost_center_id])
    return deny! unless budget_permission?
    return validation_error(["El centro de costos no existe"]) if cost_center.nil?

    # EL ID, no el objeto (firma canonica de 00-ARQUITECTURA.md 7.4).
    summary = ExpenseBudgetService.summary_for_center(cost_center.id)
    by_user = summary[:by_user]

    # `totals` se devuelve COMPLETO incluso a quien no tiene "Ver todos": son
    # cifras del centro de costos, que esa persona ya ve en la pestana de
    # resumen. Lo que se recorta es el detalle por persona.
    by_user = by_user.select { |fila| fila[:user_id] == current_user.id } unless owner_or_show_all?(cost_center)

    render json: {
      cost_center: summary[:cost_center],
      totals: summary[:totals],
      by_user: by_user
    }
  end

  # A.4 — cupo disponible de un par (centro, beneficiario).
  #
  # UNICO ENDPOINT SIN PERMISO DE MODULO, y es una decision explicita del
  # contrato: el formulario de gastos necesita el disponible para avisarle al
  # usuario antes de que guarde, y ese formulario lo usa gente que no entra al
  # modulo de Presupuesto.
  #
  # HALLAZGO DE SEGURIDAD ANOTADO (Discrepancia 2 del paquete 07): tal como esta,
  # cualquier autenticado puede iterar `user_id` y leer el presupuesto de otra
  # persona en cualquier centro. Se implementa como manda el contrato y la
  # decision de endurecerlo es del cliente; la mitigacion de una linea seria
  # exigir `params[:user_id].to_i == current_user.id` salvo admin o "Ver todos".
  def get_expense_budget_available
    if params[:cost_center_id].blank? || params[:user_id].blank?
      return validation_error(["Debe indicar el centro de costos y el responsable"])
    end

    result = ExpenseBudgetService.available_for(
      cost_center_id: params[:cost_center_id],
      user_id: params[:user_id],
      exclude_expense_id: params[:exclude_expense_id].presence
    )

    render json: {
      cost_center_id: params[:cost_center_id].to_i,
      user_id: params[:user_id].to_i,
      has_budget: result[:has_budget],
      # Con has_budget false los tres montos van en "0.0", NUNCA en nil: el
      # frontend hace parseFloat sobre ellos y `parseFloat(null)` es NaN.
      assigned: result[:assigned],
      spent: result[:spent],
      available: result[:available]
    }
  end

  # A.5 — crear partida.
  def create
    return deny! unless budget_permission?("Crear")

    cost_center = CostCenter.find_by(id: params[:cost_center_id])
    return validation_error(["El centro de costos no existe"]) if cost_center.nil?
    return deny!(MENSAJE_NO_ES_DUENO) unless owner_or_show_all?(cost_center)

    # `**`: create_budget! recibe kwargs sueltos, no un `attrs:`.
    result = ExpenseBudgetService.create_budget!(**expense_budget_params_create, actor: current_user)

    if result.ok?
      render json: { success: "¡La partida fue creada con exito!", type: "success",
                     register: ActiveModelSerializers::SerializableResource.new(result.value, serializer: ExpenseBudgetSerializer) }
    else
      validation_error(result.errors)
    end
  end

  # A.6 — editar partida. Solo amount / notes / active.
  def update
    return deny! unless budget_permission?("Editar")
    return deny!(MENSAJE_NO_ES_DUENO) unless owner_or_show_all?(@expense_budget.cost_center)

    # `attrs` es POSICIONAL en update_budget! (firma canonica de 7.4).
    result = ExpenseBudgetService.update_budget!(@expense_budget, expense_budget_params_update, actor: current_user)

    if result.ok?
      render json: { success: "¡La partida fue actualizada con exito!", type: "success",
                     register: ActiveModelSerializers::SerializableResource.new(result.value, serializer: ExpenseBudgetSerializer) }
    else
      validation_error(result.errors)
    end
  end

  # A.7 — eliminar partida.
  def destroy
    return deny! unless budget_permission?("Eliminar")
    return deny!(MENSAJE_NO_ES_DUENO) unless owner_or_show_all?(@expense_budget.cost_center)

    result = ExpenseBudgetService.destroy_budget!(@expense_budget, actor: current_user)

    if result.ok?
      # `type: "delete"` y no "success": es lo que el frontend usa para sacar la
      # fila de la tabla sin recargar la pagina.
      render json: { success: "¡La partida fue eliminada!", type: "delete" }
    else
      validation_error(result.errors)
    end
  end

  private

  # Memoizado, mismo patron que ReportExpensesController#is_admin?: sin el, cada
  # lectura de permiso vuelve a consultar el rol.
  def is_admin?
    @_is_admin ||= current_user.rol.name == "Administrador"
  end

  def budget_permission?(action = "Ingreso al modulo")
    is_admin? || has_menu_permission?("Presupuesto", action)
  end

  # La autorizacion especial de negocio. El dueno del centro administra SUS
  # partidas sin necesidad de "Ver todos"; en un centro ajeno, no.
  def owner_or_show_all?(cost_center)
    is_admin? ||
      cost_center.user_owner_id == current_user.id ||
      has_menu_permission?("Presupuesto", "Ver todos")
  end

  # 403 CON CUERPO JSON, siempre. Todo `fetch` del repo hace `.then(r => r.json())`
  # sin mirar el status: un `head :forbidden` sin cuerpo revienta las pantallas
  # con "SyntaxError: Unexpected end of JSON input" en vez de mostrar el mensaje.
  def deny!(message = "No tiene permiso para realizar esta acción")
    render json: { type: "error", message: [message] }, status: :forbidden
  end

  # Error de validacion con HTTP 200: es el patron viejo de esta aplicacion y el
  # frontend discrimina por `type`, no por el status.
  def validation_error(messages)
    render json: { success: "¡Ocurrió un error!", type: "error", message: Array(messages) }
  end

  def set_expense_budget
    # Un id inexistente levanta RecordNotFound, que Rails traduce a 404. No se
    # captura a proposito: no hay nada util que decirle al cliente y capturarlo
    # obligaria a inventar un contrato de error para un caso que solo ocurre con
    # una pantalla desincronizada.
    @expense_budget = ExpenseBudget.find(params[:id])
  end

  # Tope duro de 100 filas por pagina: `per_page=100000` con un serializer que
  # toca tres asociaciones tumba el proceso. El `max(1)` cubre `per_page=0` y
  # `per_page=abc` (`.to_i` de un texto es 0), que si no dejarian a will_paginate
  # dividiendo por cero.
  def page_size(default)
    [[(params[:per_page] || default).to_i, 1].max, 100].min
  end

  def sort_dir
    params[:dir] == "asc" ? "ASC" : "DESC"
  end

  # El formulario manda "$1,000,000" desde NumberFormat. Se limpia aqui tambien,
  # por defensa: el mismo endpoint lo consume el paquete 11 desde WhatsApp.
  def normalized_amount
    raw = params[:amount]
    return nil if raw.nil?
    raw.is_a?(Numeric) ? raw : raw.to_s.gsub(/[$,\s]/, "")
  end

  # OJO: `user_id` es el BENEFICIARIO de la partida y JAMAS lleva un
  # `reverse_merge(user_id: current_user.id)` como el de los gastos. Quien la
  # crea va en `created_by_id` y lo pone el servicio a partir de `actor:`.
  # Confundirlos asignaria al jefe el presupuesto de todo su equipo, y el error
  # es silencioso: la partida se crea y la pantalla se ve bien.
  def expense_budget_params_create
    { cost_center_id: params[:cost_center_id],
      user_id: params[:user_id],
      amount: normalized_amount,
      notes: params[:notes] }
  end

  # `cost_center_id` y `user_id` NO estan y no pueden estar (A.6): mover una
  # partida de centro o de beneficiario cambiaria retroactivamente el cupo de dos
  # pares. Si llegan en el body se ignoran en silencio.
  #
  # `.compact` para que un PATCH que solo trae `amount` no borre las notas.
  def expense_budget_params_update
    { amount: normalized_amount, notes: params[:notes], active: params[:active] }.compact
  end

  # Calcula `spent` y `available` de TODAS las partidas de la pagina con 2
  # queries fijas.
  #
  # SIN ESTO LA PANTALLA CAE EN N+1 GARANTIZADO: cada uno de los dos montos es un
  # SUM, asi que una pagina de 50 partidas costaria 100 consultas. El serializer
  # tiene prohibido resolverlos por su cuenta.
  #
  # `available` es del PAR (centro, beneficiario), no de la fila: todas las
  # partidas del mismo par muestran el mismo disponible. Es intencional (2.6): no
  # existe imputacion parcial entre partidas, asi que prorratear seria inventar
  # un numero.
  def preload_amounts!(budgets)
    return if budgets.empty?

    center_ids = budgets.map(&:cost_center_id).uniq
    user_ids = budgets.map(&:user_id).uniq

    assigned = ExpenseBudget.where(cost_center_id: center_ids, user_id: user_ids, active: true)
                            .group(:cost_center_id, :user_id).sum(:amount)
    # Misma expresion que ExpenseBudgetService.available_for: `invoice_value` es
    # float y sumarlo crudo en Postgres acumula error, asi que se castea a
    # numeric y se redondea POR FILA. Si aqui se sumara distinto, la tabla de
    # partidas mostraria un disponible que no coincide con el que el servicio usa
    # para aprobar o exceder un gasto.
    spent = ReportExpense.where(cost_center_id: center_ids, user_invoice_id: user_ids)
                         .where.not(budget_status: ExpenseBudgetService::STATUS_EXCEDIDO)
                         .group(:cost_center_id, :user_invoice_id).sum(ExpenseBudgetService::SPENT_EXPR)

    # Las dos consultas traen el producto cartesiano de ids (filas de mas) y aqui
    # se indexa por el par exacto. Son 2 queries fijas, no N.
    budgets.each do |b|
      key = [b.cost_center_id, b.user_id]
      gastado = (spent[key] || 0).to_d.round(2)
      asignado = (assigned[key] || 0).to_d.round(2)
      b.spent_amount = gastado
      b.available_amount = (asignado - gastado)
    end
  end
end

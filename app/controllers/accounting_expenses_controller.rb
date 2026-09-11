# Backend de la pantalla de Contabilidad (paquete 06, bloque B).
#
# La pantalla React (`app/views/accounting_expenses/index.html.erb` y el pack
# `AccountingExpenseIndex.js`) es del paquete 09: aqui se entrega la accion
# `index` con su `@estados` y los cuatro endpoints que la alimentan. Hasta que
# el 09 mergee, `GET /accounting_expenses` en HTML no tiene plantilla, y eso es
# lo esperado: NO se crea un ERB provisional.
class AccountingExpensesController < ApplicationController
  before_action :authenticate_user!
  before_action :require_accounting_module!
  include ApplicationHelper

  # Tope de la aprobacion masiva. Aplica tambien a `ids[]`: un cliente que mande
  # 10.000 ids es indistinguible de un filtro mal armado.
  MAX_BULK = 500

  # Allowlist de ordenamiento. Todo lo que no este aqui cae al orden por defecto:
  # `params[:sort]` entra a un `Arel.sql`, que NO escapa nada.
  SORT_COLUMNS = %w[id invoice_name invoice_date identification invoice_number invoice_value
                    invoice_tax invoice_total currency is_acepted accounting_approved
                    accounting_approved_at created_at updated_at].freeze

  # `ids` es un FILTRO VALIDO (correccion 5 / §C.4): es lo que da backend a la
  # aprobacion por seleccion multiple del paquete 09.
  #
  # `accounting_approved` NO esta en la lista a proposito: es el estado objetivo,
  # no un recorte. Aceptarlo dejaria pasar `accounting_approved=false`, que es
  # toda la tabla, y reproduciria exactamente el bug de
  # report_expenses_controller.rb#update_filter_values.
  # Sin `is_acepted`: la pantalla solo muestra gastos aceptados operativamente
  # (ver `filtered_scope`), asi que no hay nada que filtrar por ese campo.
  FILTER_KEYS = %i[cost_center_id user_invoice_id start_date end_date currency
                   budget_status type_identification_id payment_type_id q ids].freeze

  def index
    @estados = {
      approve: is_admin? || has_menu_permission?("Contabilidad", "Aprobar"),
      export: is_admin? || has_menu_permission?("Contabilidad", "Exportar a excel"),
      show_all: is_admin? || has_menu_permission?("Contabilidad", "Ver todos")
    }

    respond_to do |format|
      # La plantilla HTML la escribe el paquete 09.
      format.html
      # Mismo `@estados`, servido como JSON. Existe para que el backend sea
      # verificable antes de que el 09 mergee; el 09 puede seguir leyendo la
      # variable de instancia desde su ERB sin cambiar nada.
      format.json { render json: { estados: @estados } }
    end
  end

  def get_accounting_expenses
    scope = filtered_scope(include_approved_exceeded: true)
    total = scope.count

    per_page = [(params[:per_page] || 50).to_i, 100].min
    per_page = 50 unless per_page.positive?

    rows = ordenar(scope).paginate(page: params[:page], per_page: per_page)

    render json: {
      data: ActiveModelSerializers::SerializableResource.new(rows, each_serializer: ReportExpenseSerializer),
      total: total
    }
  end

  def update_accounting_state
    return forbidden! unless is_admin? || has_menu_permission?("Contabilidad", "Aprobar")

    expense = ReportExpense.find(params[:id])
    approve = params[:state].to_s == "true"

    # AQUI HABIA UN CANDADO: un gasto excedido no se podia aprobar contablemente.
    # Se retira por decision de producto (2026-08-29). El razonamiento del dueño
    # del producto: "eso lo puede aprobar alguien" —el exceso presupuestal es
    # informacion para quien decide, no una prohibicion—. La factura existe y hay
    # que pagarla; negar la aprobacion no la hacia desaparecer, solo dejaba al
    # contador sin forma de cerrar el gasto y sin explicacion en pantalla.
    #
    # El exceso se sigue viendo: `budget_status` y `budget_reason` viajan en el
    # JSON y el aviso de la tabla los muestra. Se informa, no se bloquea, que es
    # la misma regla que ya seguia el guardado del gasto.

    # `update_columns` Y NO `update`, y esto NO es un atajo: es la MISMA escritura
    # que ya hacia la aprobacion masiva con `update_all` unas lineas mas abajo.
    #
    # POR QUE. `update` corre TODAS las validaciones del gasto, y 4.985 de los
    # 5.017 gastos historicos no tienen `user_invoice_id` (`belongs_to
    # :user_invoice` es obligatorio). Aprobar uno de ellos fallaba con "User
    # invoice must exist" —un dato que no tiene nada que ver con la aprobacion
    # contable— y dejaba 2.469 gastos de la bandeja imposibles de aprobar de a
    # uno. Los mismos gastos SI se aprobaban en masa, porque `update_all` se
    # salta las validaciones: una fila no se podia y cincuenta si.
    #
    # Los tres campos los escribe el SERVIDOR y ninguna validacion del modelo los
    # mira, asi que saltarselas no relaja ningun control real. Lo que si hay que
    # escribir a mano es lo que el callback ya no hara: `last_user_edited_id` y
    # `updated_at`, exactamente igual que en la aprobacion masiva. El RegisterEdit
    # de la auditoria se escribe abajo, explicitamente, y no depende de callbacks.
    #
    # Esto NO arregla la causa: los 4.985 gastos sin responsable siguen sin
    # responsable, y eso rompe tambien el presupuesto (que se calcula por par
    # centro/beneficiario). Es una limpieza de datos aparte.
    expense.update_columns(
      accounting_approved: approve,
      accounting_approved_by_id: approve ? current_user.id : nil,
      accounting_approved_at: approve ? Time.now : nil,
      last_user_edited_id: current_user.id,
      updated_at: Time.now
    )

    # El RegisterEdit se escribe AQUI y no con `audit_field` del concern
    # RegisterAuditable: el texto de una aprobacion contable queda por debajo del
    # umbral de longitud del concern y no registraria nada, y bajar ese umbral
    # (que es del paquete 03) hace aparecer un registro fantasma en CADA
    # creacion de gasto. Modulo "Contabilidad", sin el typo historico "Gatos".
    RegisterEdit.create(
      user_id: current_user.id, register_user_id: expense.id, state: "pending",
      date_update: Time.now, module: "Contabilidad", type_edit: "edito",
      description: "<p><strong>(APROBACIÓN CONTABLE)</strong></p><p>Gasto #{expense.id}: <b>#{expense.accounting_state_label}</b> por #{current_user.names}</p>"
    )

    render json: { success: approve ? "¡El gasto fue aprobado por contabilidad!" : "¡Se retiró la aprobación contable!",
                   type: "success",
                   register: ActiveModelSerializers::SerializableResource.new(expense, each_serializer: ReportExpenseSerializer) }
  end

  def update_accounting_filter_values
    return forbidden! unless is_admin? || has_menu_permission?("Contabilidad", "Aprobar")

    unless FILTER_KEYS.any? { |k| params[k].present? }
      return render json: { success: "¡Ocurrió un error!", type: "error",
                            message: ["Debe aplicar al menos un filtro antes de aprobar masivamente"] }
    end

    # La aprobacion masiva alcanza lo mismo que ve la pantalla, excedidos
    # incluidos: seria incoherente que el boton de "Aprobar" de una fila acepte
    # un excedido y el masivo del mismo filtro lo salte en silencio.
    #
    # `.limit(MAX_BULK + 1)` detecta el desborde con UNA query sin traer 10.000
    # ids a memoria.
    ids = filtered_scope.where(accounting_approved: false).limit(MAX_BULK + 1).pluck(:id)
    if ids.size > MAX_BULK
      return render json: { success: "¡Ocurrió un error!", type: "error",
                            message: ["El filtro devuelve más de #{MAX_BULK} gastos. Afine el filtro antes de aprobar masivamente"] }
    end

    now = Time.now
    # `update_all` y no `relation.update`: evita 500 RegisterEdit fantasma y 500
    # rondas de callbacks. Como no dispara `edit_values` ni `touch`, hay que
    # escribir `last_user_edited_id` y `updated_at` a mano en el mismo hash.
    count = ReportExpense.where(id: ids).update_all(
      accounting_approved: true, accounting_approved_by_id: current_user.id,
      accounting_approved_at: now, last_user_edited_id: current_user.id, updated_at: now
    )

    RegisterEdit.create(user_id: current_user.id, register_user_id: current_user.id, state: "pending",
                        date_update: now, module: "Contabilidad", type_edit: "edito",
                        description: "<p><strong>(APROBACIÓN CONTABLE MASIVA)</strong></p><p>#{count} gastos aprobados por #{current_user.names}</p>")

    render json: { success: "#{count} gastos aprobados por contabilidad", type: "success", count: count }
  end

  def download_file
    return forbidden! unless is_admin? || has_menu_permission?("Contabilidad", "Exportar a excel")

    @items = if params[:type] == "filtro"
               filtered_scope(include_approved_exceeded: true).order(invoice_date: :desc)
             else
               ReportExpense.accounting_visible
                            .includes(:cost_center, :user_invoice, :type_identification, :payment_type, :accounting_approved_by)
                            .then { |s| ver_todos? ? s : s.where(user_invoice_id: current_user.id) }
                            .order(invoice_date: :desc)
             end

    render xlsx: "Contabilidad de gastos", template: "accounting_expenses/download_file.xlsx.axlsx"
  end

  # ZIP con los comprobantes de los gastos seleccionados.
  #
  # POR QUE UN ZIP Y NO N DESCARGAS: contabilidad causa por lotes y bajar treinta
  # archivos de uno en uno, cada uno con su dialogo del navegador, no es una
  # tarea que alguien vaya a hacer. El limite es el mismo MAX_BULK de la
  # aprobacion masiva: el criterio de "cuantos gastos caben en una operacion" no
  # puede depender de cual boton se pulso.
  #
  # SE ARMA EN MEMORIA y no en disco: Heroku tiene filesystem efimero y un
  # Tempfile que sobreviva a la respuesta es una fuga. Con el tope de 20 MB por
  # comprobante y MAX_BULK gastos el peor caso teorico es grande, pero el real no
  # —una seleccion de contabilidad son decenas de facturas de pocos cientos de
  # KB—. Si algun dia se vuelve un problema, el cambio es a `zip_tricks` en
  # streaming, no a escribir en disco.
  #
  # Los gastos SIN comprobante no revientan el ZIP: se listan en un
  # `FALTANTES.txt` dentro del propio archivo. Un ZIP con 28 de 30 facturas y sin
  # decir cuales faltan es peor que uno que lo diga.
  def download_receipts
    return forbidden! unless is_admin? || has_menu_permission?("Contabilidad", "Exportar a excel")

    ids = accounting_ids
    if ids.blank?
      return render json: { success: "¡Ocurrió un error!", type: "error",
                            message: ["Seleccione al menos un gasto"] }
    end
    if ids.size > MAX_BULK
      return render json: { success: "¡Ocurrió un error!", type: "error",
                            message: ["Máximo #{MAX_BULK} gastos por descarga"] }
    end

    # `filtered_scope` y no `ReportExpense.where(id:)`: la descarga tiene que
    # respetar los mismos recortes que la pantalla (aceptados, y solo los propios
    # para quien no tiene "Ver todos"). Sin esto, mandar ids a mano bajaria
    # comprobantes de gastos que el usuario no puede ni ver.
    gastos = filtered_scope.order(:id)

    faltantes = []
    buffer = Zip::OutputStream.write_buffer do |zip|
      gastos.each do |gasto|
        unless gasto.receipt_file.present?
          faltantes << "##{gasto.id} - #{gasto.invoice_name} (#{gasto.invoice_number})"
          next
        end

        contenido = leer_comprobante(gasto)
        if contenido.nil?
          faltantes << "##{gasto.id} - #{gasto.invoice_name}: el archivo no se pudo leer"
          next
        end

        # El nombre lleva el id delante: dos proveedores distintos suben
        # "factura.pdf" y sin el prefijo el segundo pisaria al primero.
        zip.put_next_entry("#{gasto.id}-#{gasto.receipt_file.file.filename}")
        zip.write(contenido)
      end

      if faltantes.any?
        zip.put_next_entry("FALTANTES.txt")
        zip.write("Gastos seleccionados que no tienen comprobante adjunto:\n\n" + faltantes.join("\n") + "\n")
      end
    end

    buffer.rewind
    send_data buffer.read,
              filename: "comprobantes-#{Date.current.strftime('%Y%m%d')}.zip",
              type: "application/zip",
              disposition: "attachment"
  end

  private

# Bytes del comprobante, vengan de S3 o del disco. Devuelve nil si el archivo
  # ya no esta: un comprobante borrado del bucket no puede tumbar la descarga
  # entera de las otras 29 facturas.
  def leer_comprobante(gasto)
    gasto.receipt_file.read
  rescue StandardError => e
    Rails.logger.error("[accounting] comprobante #{gasto.id} ilegible: #{e.class}: #{e.message}")
    nil
  end

  # Memoizado para no repetir la query del rol en cada gate.
  def is_admin?
    @_is_admin ||= current_user.rol.name == "Administrador"
  end

  def ver_todos?
    is_admin? || has_menu_permission?("Contabilidad", "Ver todos")
  end

  def forbidden!
    render json: { type: "error", message: ["No tiene permiso para realizar esta acción"] },
           status: :forbidden
  end

  def require_accounting_module!
    return if is_admin? || has_menu_permission?("Contabilidad")

    if request.format.json? || request.path.start_with?("/get_", "/update_", "/download_file")
      render json: { type: "error", message: ["No tiene permiso para realizar esta acción"] },
             status: :forbidden
    else
      redirect_to root_path, alert: "No tiene permiso para ingresar al módulo de Contabilidad"
    end
  end

  # UNICA definicion del scope de esta pantalla. La comparten
  # `get_accounting_expenses`, `update_accounting_filter_values` y
  # `download_file`.
  #
  # NO se llama a `ReportExpense.search`: ese metodo define scopes de CLASE en
  # runtime, o sea estado global compartido entre requests (invariante #6). Con
  # cinco hilos de Puma, dos busquedas concurrentes se pisan los filtros en la
  # pantalla mas sensible del proyecto.
  #
  # `include_approved_exceeded:` solo lo usan las LECTURAS. La aprobacion masiva
  # lo deja en false para no tocar NUNCA un excedido.
  def filtered_scope(include_approved_exceeded: false)
    # `include_approved_exceeded` quedo SIN EFECTO y se conserva solo para no
    # cambiarle la firma a los cuatro llamadores. Existia para recuperar los
    # gastos que alguien aprobo y un recalculo posterior empujo a `excedido`,
    # porque la vista los escondia; desde que `accounting_visible` no recorta por
    # estado presupuestal no hay nada que recuperar: ya estaban todos.
    base = ReportExpense.accounting_visible

    # CONTABILIDAD SOLO VE LO APROBADO OPERATIVAMENTE. `is_acepted` es la
    # aceptacion del responsable del gasto; hasta que ocurre, el gasto todavia se
    # puede editar o rechazar y no tiene por que llegar a contabilidad.
    #
    # Va en la base y no como filtro opcional a proposito: `filtered_scope` la
    # comparten el listado, los valores de los filtros, el Excel y la APROBACION
    # MASIVA. Ponerlo aqui garantiza que la aprobacion masiva tampoco pueda tocar
    # un gasto sin aceptar, que es el caso peligroso.
    base = base.where(is_acepted: true)

    scope = base.includes(:cost_center, :user_invoice, :type_identification, :payment_type,
                          :last_user_edited, :user, :accounting_approved_by, :expense_budget)
    scope = scope.where(user_invoice_id: current_user.id) unless ver_todos?

    scope = scope.where(id: accounting_ids)                                       if accounting_ids.present?
    scope = scope.where(cost_center_id: params[:cost_center_id])                  if params[:cost_center_id].present?
    scope = scope.where(user_invoice_id: params[:user_invoice_id])                if params[:user_invoice_id].present?
    scope = scope.where("report_expenses.invoice_date >= ?", params[:start_date]) if params[:start_date].present?
    scope = scope.where("report_expenses.invoice_date <= ?", params[:end_date])   if params[:end_date].present?
    scope = scope.where(accounting_approved: params[:accounting_approved])        if params[:accounting_approved].present?
    # `is_acepted` YA NO SE FILTRA AQUI: la base lo fija en true, asi que este
    # filtro solo podia repetir lo mismo o pedir un imposible (`false`) y
    # devolver siempre cero filas. El selector "Estado operativo" se quito de la
    # pantalla por lo mismo.
    scope = scope.where(currency: params[:currency])                              if params[:currency].present?
    scope = scope.where(budget_status: params[:budget_status])                    if params[:budget_status].present?
    scope = scope.where(type_identification_id: params[:type_identification_id])  if params[:type_identification_id].present?
    scope = scope.where(payment_type_id: params[:payment_type_id])                if params[:payment_type_id].present?

    if params[:q].present?
      t = "%#{params[:q].to_s.downcase}%"
      scope = scope.where(
        "LOWER(report_expenses.invoice_name) LIKE :t OR LOWER(report_expenses.description) LIKE :t OR " \
        "LOWER(report_expenses.invoice_number) LIKE :t OR LOWER(report_expenses.identification) LIKE :t OR " \
        "CAST(report_expenses.id AS TEXT) LIKE :t", t: t
      )
    end

    scope
  end

  # `params.permit(ids: [])` y no `params[:ids]` a secas: sin el permit, Rails
  # 6.1 lanza al convertir un array de parametros no permitidos.
  def accounting_ids
    @_accounting_ids ||= params.permit(ids: [])[:ids] || []
  end

  def ordenar(scope)
    dir = params[:dir] == "asc" ? "ASC" : "DESC"

    if SORT_COLUMNS.include?(params[:sort])
      scope.order(Arel.sql("report_expenses.#{params[:sort]} #{dir}"))
    elsif params[:sort] == "cost_center_code"
      scope.joins(:cost_center).order(Arel.sql("cost_centers.code #{dir}"))
    elsif params[:sort] == "user_invoice_name"
      scope.joins(:user_invoice).order(Arel.sql("users.names #{dir}"))
    else
      scope.order(invoice_date: :desc)
    end
  end
end

class ReportExpensesController < ApplicationController
  before_action :authenticate_user!
  before_action :report_expense_find, only: [:update, :destroy, :delete_receipt, :download_receipt]
  skip_before_action :verify_authenticity_token, only: [:upload_file]
  include ApplicationHelper

  # Columnas por las que se puede ordenar cualquiera de las dos tablas de gastos.
  # Es una ALLOWLIST y no una denylist porque `params[:sort]` termina dentro de un
  # `Arel.sql`, que no escapa nada: cualquier cosa fuera de esta lista cae al
  # orden por defecto (`created_at desc`).
  #
  # Los alias `cost_center_code` y `user_invoice_name` NO estan aqui: no son
  # columnas de `report_expenses` y se resuelven aparte, con su join.
  EXPENSE_SORT_COLUMNS = %w[id invoice_name invoice_date identification description invoice_number
                            invoice_value invoice_tax invoice_total is_acepted currency
                            budget_status accounting_approved created_at updated_at].freeze

  def index
    # Usar helpers memoizados - evita query de ModuleControl y accion_modules (785ms -> ~0ms)
    @estados = {
      create: is_admin? || has_menu_permission?("Gastos", "Crear"),
      edit: is_admin? || has_menu_permission?("Gastos", "Editar"),
      delete: is_admin? || has_menu_permission?("Gastos", "Eliminar"),
      closed: is_admin? || has_menu_permission?("Gastos", "Aceptar gasto"),
      export: is_admin? || has_menu_permission?("Gastos", "Exportar a excel"),
      show_user: is_admin? || has_menu_permission?("Gastos", "Cambiar responsable"),
      # Importar y descargar la plantilla: SOLO administrador. El import salta el
      # formulario, el presupuesto y las reglas, asi que no se reparte por
      # permisos de menu.
      import: puede_importar?,
      # El formulario necesita saberlo para marcar el campo y cortar antes de
      # subir. NO es un permiso: es el mismo flag del modelo, que es quien
      # rechaza de verdad.
      receipt_required: ReportExpense.comprobante_obligatorio?,
      # Las dos banderas que deciden QUE pestañas de la lista se pintan. Sin
      # ellas el frontend tendria que adivinar: pintar "Todos" a quien no lo
      # puede ver devuelve una tabla recortada sin explicacion, y pintar
      # "Centros a mi cargo" a quien no es propietario de ninguno devuelve una
      # tabla vacia que parece un error.
      show_all: is_admin? || has_menu_permission?("Gastos", "Ver todos"),
      owns_cost_centers: CostCenter.where(user_owner_id: current_user.id).exists?,
    }
  end

  def indicators_expenses
    @validate = is_admin?
  end

  def get_report_expenses
    # Base query con includes para evitar N+1. `accounting_approved_by` entra al
    # includes porque el serializer lo emite desde que el paquete 07 lo agrego:
    # sin el, una pagina de 50 gastos aprobados cuesta 50 consultas de mas.
    base_query = ReportExpense.includes(:cost_center, :user_invoice, :type_identification, :payment_type, :last_user_edited, :user, :accounting_approved_by)

    # Recorte de visibilidad: permiso + pestaña elegida. UNICO sitio donde se
    # decide, compartido con el Excel y con la aceptacion masiva.
    base_query = apply_expense_scope(base_query)

    # Aplicar filtros de búsqueda. Ya no hace falta la guarda previa de "¿hay
    # algún filtro?": con un hash vacío el builder devuelve `all`, que es
    # exactamente lo que hacía ese `if`.
    base_query = base_query.search(report_expense_search_filters)
    base_query = apply_expense_filters(base_query)
    base_query = apply_free_text(base_query)

    # Obtener total antes de paginar (una sola query con count)
    total = base_query.count

    report_expenses = order_expenses(base_query).paginate(page: params[:page], per_page: params[:per_page] || 50)

    render json: {
             data: ActiveModelSerializers::SerializableResource.new(report_expenses, each_serializer: ReportExpenseSerializer),
             total: total,
           }
  end

  def get_cost_center_report_expenses
    # Base query con includes para evitar N+1
    base_query = ReportExpense.includes(:cost_center, :user_invoice, :type_identification, :payment_type, :last_user_edited, :user, :accounting_approved_by)
                              .where(cost_center_id: params[:id])

    # Aplicar filtros de búsqueda. Ya no hace falta la guarda previa de "¿hay
    # algún filtro?": con un hash vacío el builder devuelve `all`, que es
    # exactamente lo que hacía ese `if`.
    base_query = base_query.search(report_expense_search_filters)
    base_query = apply_expense_filters(base_query)
    # Misma busqueda libre que la tabla general, y con el `id::text` que a esta
    # le faltaba: el usuario pega el numero del gasto en el buscador y esperaba
    # encontrarlo.
    base_query = apply_free_text(base_query)

    # Obtener total antes de paginar
    total = base_query.count

    # Paginar
    report_expenses = order_expenses(base_query).paginate(page: params[:page], per_page: params[:per_page] || 100)

    render json: {
      data: ActiveModelSerializers::SerializableResource.new(report_expenses, each_serializer: ReportExpenseSerializer),
      total: total,
    }
  end

  # ACEPTAR MUEVE PRESUPUESTO. Desde que el consumo de cupo depende de
  # `is_acepted` (ver ExpenseBudgetService.consumidores), cambiar este estado
  # cambia cuanta plata esta comprometida en el par (centro, responsable), asi
  # que hay que reevaluarlo en FIFO. Sin esto el gasto pasa a "Aceptado" y el
  # disponible de la pantalla se queda como estaba hasta el proximo guardado de
  # cualquier otro gasto del mismo par: un desfase invisible y dificil de atar a
  # su causa.
  def update_state_report_expense
    report_expense = ReportExpense.find(params[:id])
    update_status = report_expense.update(is_acepted: params[:state])

    if update_status && report_expense.cost_center_id.present? && report_expense.user_invoice_id.present?
      ExpenseBudgetService.reevaluate_center_user!(cost_center_id: report_expense.cost_center_id,
                                                  user_id: report_expense.user_invoice_id,
                                                  actor: current_user)
      # El reevaluo escribe con update_columns, asi que el objeto en memoria
      # —el que se serializa abajo— quedo con el budget_status viejo.
      report_expense.reload
    end

    if update_status
      render :json => {
        success: "¡El registro fue actualizado con exito!",
        register: ActiveModelSerializers::SerializableResource.new(report_expense, each_serializer: ReportExpenseSerializer),
        type: "success",
      }
    end
  end

  # CABLEADO PRESUPUESTAL (tarea 23 del paquete 07, §7.4).
  #
  # `persist_with_evaluation!` es el PUNTO DE ENTRADA UNICO para guardar un
  # gasto: toma el lock del centro, evalua el cupo, guarda y reevalua el par en
  # FIFO. Aqui NO se llama a `evaluate!` ni se hace `save` por cuenta propia, y
  # no se abren transacciones (§4.2: el lock vive en el servicio).
  #
  # Sin esto `budget_status` NUNCA se calcula por la via web y todo gasto queda
  # en `sin_presupuesto`: el tablero del 08, las columnas del 09 y la vista de
  # contabilidad del 06 muestran datos falsos con total confianza.
  #
  # Nota sobre el `ReportExpense.create` + `.save` que habia antes (doble
  # escritura): desaparece como efecto del cableado, no como refactor aparte.
  def create
    report_expense = ReportExpense.new(report_expense_params_create)
    result = ExpenseBudgetService.persist_with_evaluation!(report_expense, actor: current_user)

    if result.ok?
      # DESPUES y FUERA del servicio: `recalculate_cost_center` depende de la
      # ivar @cost_center del helper y no puede correr dentro del lock.
      recalculate_cost_center(report_expense.cost_center_id, "reportes") if report_expense.cost_center_id.present?
      render :json => {
               success: "El Registro fue creado con exito!",
               register: ActiveModelSerializers::SerializableResource.new(result.value, each_serializer: ReportExpenseSerializer),
               type: "success",
               # AL NIVEL DE LA RESPUESTA Y NO DENTRO DE `register`: no es un
               # atributo del gasto que la tabla pinte, es el resultado de ESTE
               # guardado. Meterlo en ReportExpenseSerializer obligaria, por el
               # invariante #7, a arrastrar un jsonb hasta el Excel de export y
               # el mapeo del import, donde no significa nada.
               rule_violations: reglas_incumplidas(result.value),
             }
    else
      render :json => {
               success: "El Registro No se creo!",
               message: result.errors,
               type: "error",
               # Separadas de `message` para que el formulario pueda distinguir
               # "incumple una regla de negocio" de "fallo algo": lo primero se
               # muestra como una lista de reglas y se deja el modal abierto para
               # corregir; lo segundo es un error generico.
               rule_violations: reglas_incumplidas(report_expense_del_resultado(result)),
             }
    end
  end

  def update_filter_values
    # EL MISMO RECORTE QUE LA TABLA. Esta accion acepta TODO lo que casa con el
    # filtro, no solo la pagina visible: si la pestaña recorta la lista y esto
    # no, el usuario ve 3 filas de sus centros y acepta miles ajenos.
    report_expenses = apply_expense_scope(ReportExpense.all)
                        .search(report_expense_search_filters)
                        .order(invoice_date: :desc)

    # Los pares afectados se capturan ANTES del update: despues el scope sigue
    # siendo el mismo, pero traerlos aqui evita repetir la consulta de filtro.
    pares = report_expenses.pluck(:cost_center_id, :user_invoice_id).uniq.reject { |c, u| c.blank? || u.blank? }

    update_status = report_expenses.update(is_acepted: true)

    # Mismo motivo que en update_state_report_expense: aceptar compromete cupo.
    # Se reevalua UNA vez por par, no una por gasto.
    if update_status
      pares.each do |centro_id, usuario_id|
        ExpenseBudgetService.reevaluate_center_user!(cost_center_id: centro_id, user_id: usuario_id,
                                                    actor: current_user)
      end
    end

    if update_status
      render :json => {
               success: "Los registros fue actualizados con exito!",
               type: "success",
             }
    else
      render :json => {
               success: "El Registro No se creo!",
               type: "error",
             }
    end
  end

  def update
    # LOS DOS `previous_*` SE CAPTURAN ANTES DEL assign_attributes. Si se leen
    # despues ya cambiaron, y el par (centro, responsable) de ORIGEN nunca se
    # reevalua: un gasto que estaba excedido alli se queda excedido para siempre
    # aunque el cupo se haya liberado.
    prev_cost_center_id  = @report_expense.cost_center_id
    prev_user_invoice_id = @report_expense.user_invoice_id

    @report_expense.assign_attributes(report_expense_params_update)
    result = ExpenseBudgetService.persist_with_evaluation!(
      @report_expense, actor: current_user,
      previous_cost_center_id: prev_cost_center_id,
      previous_user_invoice_id: prev_user_invoice_id
    )

    if result.ok?
      recalculate_cost_center(@report_expense.cost_center_id, "reportes") if @report_expense.cost_center_id.present?
      # Mover un gasto de centro deja MAL el centro viejo: sus agregados siguen
      # contando un gasto que ya no le pertenece.
      if prev_cost_center_id.present? && prev_cost_center_id != @report_expense.cost_center_id
        recalculate_cost_center(prev_cost_center_id, "reportes")
      end
      render :json => {
               success: "El Registro fue actualizado con exito!",
               register: ActiveModelSerializers::SerializableResource.new(result.value, each_serializer: ReportExpenseSerializer),
               type: "success",
               rule_violations: reglas_incumplidas(result.value),
             }
    else
      render :json => {
               success: "El Registro No se creo!",
               message: result.errors,
               type: "error",
               # Separadas de `message` para que el formulario pueda distinguir
               # "incumple una regla de negocio" de "fallo algo": lo primero se
               # muestra como una lista de reglas y se deja el modal abierto para
               # corregir; lo segundo es un error generico.
               rule_violations: reglas_incumplidas(report_expense_del_resultado(result)),
             }
    end
  end

  # Tarea 20 del paquete 07: corrige el bug preexistente de §2.7. El `destroy`
  # no reevaluaba el presupuesto NI recalculaba el centro, asi que borrar un
  # gasto dejaba `viat_costo_real` inflado y a los gastos posteriores marcados
  # como `excedido` contra un cupo que ya estaba libre.
  def destroy
    # Se capturan ANTES de destruir: despues el objeto sigue en memoria pero
    # depender de eso es fragil, y `recalculate_cost_center` hace
    # `CostCenter.find(cost)` y reventaria con nil.
    cost_center_id  = @report_expense.cost_center_id
    user_invoice_id = @report_expense.user_invoice_id

    if @report_expense.destroy
      ExpenseBudgetService.on_expense_destroyed!(cost_center_id: cost_center_id,
                                                 user_id: user_invoice_id,
                                                 actor: current_user)
      # DESPUES y FUERA del servicio (lee current_user y la ivar @cost_center).
      recalculate_cost_center(cost_center_id, "reportes") if cost_center_id.present?
      render :json => {
               success: "El Registro fue eliminado con exito!",
               type: "success",
             }
    else
      render :json => {
               success: "El Registro No se elimino!",
               message: @report_expense.errors.full_messages,
               type: "error",
             }
    end
  end

  # === COMPROBANTE ADJUNTO (paquete 06) =====================================
  #
  # Este archivo tiene dueño unico 07 (strong params, filtros, orden y cableado
  # presupuestal). El paquete 06 aporta SOLO estas dos acciones, por la excepcion
  # documentada de §7.2. Los strong params `:receipt_file` y
  # `:remove_receipt_file` los agrega el 07: aqui solo se consumen.

  def delete_receipt
    unless is_admin? || has_menu_permission?("Gastos", "Editar")
      return render json: { type: "error", message: ["No tiene permiso para realizar esta acción"] },
                    status: :forbidden
    end

    if @report_expense.receipt_file.blank?
      return render json: { success: "¡Ocurrió un error!", type: "error",
                            message: ["El gasto no tiene comprobante adjunto"] }
    end

    # `remove_receipt_file = true` + `save`, y NO `remove_receipt_file!`: el
    # segundo salta las validaciones y la auditoria, asi que borraria el archivo
    # sin dejar rastro de quien lo hizo.
    @report_expense.remove_receipt_file = true

    if @report_expense.save
      render json: { success: "¡El comprobante fue eliminado!", type: "success",
                     register: ActiveModelSerializers::SerializableResource.new(@report_expense, each_serializer: ReportExpenseSerializer) }
    else
      render json: { success: "¡Ocurrió un error!", type: "error",
                     message: @report_expense.errors.full_messages }
    end
  end

  def download_receipt
    unless is_admin? || has_menu_permission?("Gastos", "Ver todos") || @report_expense.user_invoice_id == current_user.id
      return render json: { type: "error", message: ["No tiene permiso para realizar esta acción"] },
                    status: :forbidden
    end

    if @report_expense.receipt_file.blank?
      return render json: { type: "error", message: ["El gasto no tiene comprobante adjunto"] },
                    status: :not_found
    end

    # CONTRATO CON EL PAQUETE 12 (§7.8): la descarga se FUERZA.
    #
    # `redirect_to receipt_file.url` a secas NAVEGA en Chromium en vez de
    # descargar —la URL firmada de S3 no lleva Content-Disposition— y el
    # `page.waitForEvent("download")` del escenario E4.3 se cuelga 60 s.
    #
    # Rails 6.1 NO acepta `allow_other_host:` (se agrego en Rails 7): no se pone.
    #
    # `?disposition=inline` es la UNICA excepcion y existe para el modal de
    # previsualizacion: con "attachment" el navegador descarga en vez de pintar,
    # y el modal salia EN BLANCO. Es opt-in a proposito —el default sigue siendo
    # la descarga forzada— para no romper el contrato del 12 ni el enlace de
    # descarga de la tabla, que no manda el parametro.
    modo = params[:disposition].to_s == "inline" ? "inline" : "attachment"
    disposicion = "#{modo}; filename=\"#{@report_expense.receipt_file.file.filename}\""

    if remote_receipt_storage?
      redirect_to @report_expense.receipt_file.url(query: { "response-content-disposition" => disposicion })
    else
      # Almacenamiento local (desarrollo, test y el entorno E2E con
      # E2E_UPLOAD_ROOT=public): el equivalente exacto es `send_file` con la
      # misma cabecera. El Content-Type se conserva visualizable
      # (application/pdf, image/*) para que el modal de previsualizacion del
      # paquete 08 pueda montarse sobre esta misma URL.
      send_file @report_expense.receipt_file.path,
                filename: @report_expense.receipt_file.file.filename,
                type: @report_expense.receipt_file.content_type.presence || "application/octet-stream",
                disposition: modo
    end
  end

  # === CAPTURA ASISTIDA POR IA (paquete 10, contrato D.1) ===================
  #
  # Excepcion documentada de dueño (§7.2): esta accion es del paquete 10; el
  # resto del archivo sigue siendo del 07. Recibe el comprobante multipart, se
  # lo pasa a ReceiptExtractionService (que llama al agente de Taimes) y
  # devuelve los campos para PRE-CARGAR el formulario.
  #
  # NUNCA guarda nada: no instancia con save, no llama recalculate_cost_center.
  # Ambos casos responden HTTP 200 y el frontend discrimina por `type`, igual
  # que /get_exchange_rate; un fallo de la IA jamas bloquea el registro manual.
  # CSRF SI aplica (el skip de arriba solo cubre :upload_file).
  def extract_receipt
    unless is_admin? || has_menu_permission?("Gastos", "Crear")
      return render json: { type: "error", message: ["No tiene permiso para realizar esta acción"] },
                    status: :forbidden
    end
    if params[:file].blank?
      return render json: { type: "error", message: ["Debe adjuntar un comprobante"] }
    end

    center = CostCenter.find_by(id: params[:cost_center_id])
    result = ReceiptExtractionService.extract(params[:file], cost_center_code: center&.code)
    return render json: { type: "error", message: [result.error_message] } unless result.ok?

    # LA EXTRACCION YA NO EVALUA REGLAS (decision de producto, 2026-08-29). Era
    # el momento equivocado por dos motivos:
    #
    #   1. Un gasto escrito A MANO no pasa por aqui, asi que las reglas solo se
    #      veian si ademas se usaba la lectura del comprobante. Las dos formas de
    #      crear un gasto mostraban cosas distintas.
    #   2. En este punto todavia no se eligio responsable, asi que se evaluaban
    #      las reglas de `current_user` —quien captura— y no las de la persona por
    #      la que responde el gasto. Con reglas asignadas por persona, eso puede
    #      dar un resultado distinto del real.
    #
    # Las reglas se evaluan y se informan al GUARDAR, que es el unico punto por
    # el que pasan los dos caminos y donde ya se conoce el responsable.
    fields, warnings = build_extraction_draft(result)
    render json: { type: "success", fields: fields, confidence: result.confidence,
                   warnings: warnings }
  end

  # PLANTILLA DE IMPORTACION. Se genera contra la base en cada descarga: las
  # hojas de catalogo tienen que traer los valores EXACTOS, porque el import
  # resuelve centro, responsable, tipo y medio de pago por texto y `TRIM` no
  # limpia los espacios de en medio. Ver el encabezado de la vista.
  def import_template
    return forbidden_import! unless puede_importar?

    # Sin catalogo de centros de costo: hay 10.901 y pueden ser 21.000. El codigo
    # lo escribe quien llena la plantilla, que ya sabe en que centro trabaja.
    @responsables = User.where.not(names: [nil, ""]).order(:names).pluck(:names).uniq
    @tipos        = ReportExpenseOption.where(category: "Tipo").order(:name).pluck(:name)
    @medios       = ReportExpenseOption.where(category: "Medio de pago").order(:name).pluck(:name)

    # Las filas de ejemplo usan valores REALES del catalogo: una plantilla cuyo
    # ejemplo no importa es peor que no tener ejemplo.
    @ejemplos = [
      ["CC-0001", @responsables.first, Date.current, "Hotel Ejemplo S.A.S", "900123456",
       "Alojamiento salida a obra", "FE-1001", @tipos.first, @medios.first, 250_000, 47_500],
      ["CC-0001", @responsables.first, Date.current - 3, "Estación de servicio", "800987654",
       "Combustible camioneta", "FE-1002", (@tipos[1] || @tipos.first), (@medios[1] || @medios.first),
       120_000, 0],
    ]

    render xlsx: "Plantilla de gastos", template: "report_expenses/import_template.xlsx.axlsx"
  end

  def upload_file
    # SOLO ADMINISTRADOR. Antes esta accion no tenia NINGUNA comprobacion —y
    # ademas `verify_authenticity_token` esta saltado para ella—, asi que
    # cualquier usuario autenticado podia crear gastos en masa en cualquier
    # centro y a nombre de cualquiera. El import salta el formulario, el
    # presupuesto y las reglas: es la puerta mas ancha de la aplicacion.
    return forbidden_import! unless puede_importar?

    status_upload = ReportExpense.import(params[:file], current_user.id)
    if status_upload
      render :json => {
               success: "#{status_upload[0].length} subieron con exito, #{status_upload[1].length} no se puedieron crear por favor revisar",
               type: "success",
               data: status_upload,
             }
    else
      render :json => {
               success: "Los Archivos no fueron importados!",
               type: "error",
             }
    end
  end

  def download_file
    # EL MISMO RECORTE QUE LA TABLA (permiso + pestaña). Antes estaba escrito
    # aqui otra vez, en dos ramas que repetian el `where(user_invoice_id:)`; con
    # la pestaña nueva serian seis. El Excel exporta lo que el usuario ve.
    visible = apply_expense_scope(ReportExpense.all)

    @items = if params[:type] == "filtro"
               # Mismos filtros que la tabla: el Excel tiene que exportar
               # exactamente lo que el usuario esta viendo, incluidos los cuatro
               # filtros nuevos.
               apply_free_text(apply_expense_filters(visible.search(report_expense_search_filters))).order(invoice_date: :desc)
             else
               visible.order(invoice_date: :desc)
             end

    render xlsx: "Reporte de gastos", template: "report_expenses/download_file.xlsx.axlsx"

    #  centro = ModuleControl.find_by_name("Gastos")
    #  estado = current_user.rol.accion_modules.where(module_control_id: centro.id).where(name: "Ver todos").exists?
    #  validate = (current_user.rol.name == "Administrador" ? true : estado)

    #  if validate
    #    if params[:type] == "filtro"
    #      centro_show = ReportExpense.search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date]).order(invoice_date: :desc)
    #      puts centro_show.count
    #    else
    #      centro_show = ReportExpense.all.order(invoice_date: :desc)
    #    end
    #  else
    #    if params[:type] == "filtro"
    #      centro_show = ReportExpense.where(user_invoice_id: current_user.id).search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date]).order(invoice_date: :desc)
    #    else
    #      centro_show = ReportExpense.where(user_invoice_id: current_user.id).order(invoice_date: :desc)
    #    end
    #  end

    #  respond_to do |format|
    #    format.xlsx do
    #      task = Spreadsheet::Workbook.new
    #      sheet = task.create_worksheet

    #      rows_format = Spreadsheet::Format.new color: :black,
    #                                            weight: :normal,
    #                                            size: 13,
    #                                            align: :left

    #      centro_show.each.with_index(1) do |task, i|
    #        position = sheet.row(i)

    #        sheet.row(1).default_format = rows_format
    #        position[0] = task.cost_center.present? ? task.cost_center.code : ""
    #        position[1] = task.user_invoice.names
    #        position[2] = task.invoice_date.month.to_s + "/" + task.invoice_date.day.to_s + "/" + task.invoice_date.year.to_s
    #        position[3] = task.invoice_name
    #        position[4] = task.identification

    #        position[5] = task.description
    #        position[6] = task.invoice_number
    #        position[7] = task.type_identification.present? ? task.type_identification.name : ""
    #        position[8] = task.payment_type.present? ? task.payment_type.name : ""
    #        position[9] = task.invoice_value
    #        position[10] = task.invoice_tax

    #        sheet.row(i).height = 25
    #        sheet.column(i).width = 40
    #        sheet.row(i).default_format = rows_format
    #      end

    #      head_format = Spreadsheet::Format.new color: :white,
    #                                            weight: :bold,
    #                                            size: 12,
    #                                            pattern_bg_color: :xls_color_10,
    #                                            pattern: 2,
    #                                            vertical_align: :middle,
    #                                            align: :left

    #      position = sheet.row(0)

    #      position[0] = "Centro de costo"
    #      position[1] = "Responsable"
    #      position[2] = "Fecha de factura"
    #      position[3] = "Nombre"
    #      position[4] = "NIT / CEDULA"
    #      position[5] = "Descripcion"
    #      position[6] = "Numero de factura"
    #      position[7] = "Tipo"
    #      position[8] = "Medio de pago"
    #      position[9] = "Valor del pago"
    #      position[10] = "IVA"

    #      sheet.row(0).height = 20
    #      sheet.column(0).width = 40
    #      sheet.column(1).width = 40
    #      sheet.column(2).width = 40
    #      sheet.column(3).width = 40
    #      sheet.column(4).width = 40
    #      sheet.column(5).width = 40
    #      sheet.column(6).width = 40
    #      sheet.column(7).width = 40
    #      sheet.column(8).width = 40
    #      sheet.column(9).width = 40
    #      sheet.column(10).width = 45

    #      sheet.row(0).each.with_index { |c, i| sheet.row(0).set_format(i, head_format) }

    #      temp_file = StringIO.new

    #      task.write(temp_file)

    #      send_data(temp_file.string, :filename => "Control_de_gastos.xlsx", :disposition => "inline")
    #    end
    #  end
  end

  private

  # Memoizado para evitar queries repetidas de rol (204ms -> ~0ms)
  def is_admin?
    @_is_admin ||= current_user.rol.name == "Administrador"
  end

  # Las reglas que el gasto incumple, en el formato plano que consume el
  # formulario.
  #
  # NO REEVALUA: lee lo que dejo la validacion del modelo sobre ESTE objeto. En
  # el rechazo el gasto no llego a guardarse, asi que `rule_violations` (la
  # columna) esta vacia y lo que sirve es la lista en memoria; en un guardado
  # exitoso las dos coinciden. Volver a llamar al servicio aqui podria dar un
  # resultado distinto del que motivo el rechazo.
  def reglas_incumplidas(expense)
    Array(expense&.violaciones_de_reglas).map do |v|
      { code: v[:code] || v["code"], message: v[:message] || v["message"] }
    end
  end

  # `result.value` es el propio gasto cuando el guardado falla, pero se protege
  # el caso de un Result sin value (lock timeout, centro inexistente).
  def report_expense_del_resultado(result)
    result.value.is_a?(ReportExpense) ? result.value : nil
  end

  # "El del rol administrador, el que tiene todo". Es el rol, no un permiso de
  # menu: no existe una accion "Importar" en la tabla de acciones, y crearla es
  # una decision de configuracion aparte.
  def puede_importar?
    is_admin?
  end

  def forbidden_import!
    render json: { success: "¡Ocurrió un error!", type: "error",
                   message: ["Solo un administrador puede importar gastos"] },
           status: :forbidden
  end

  def report_expense_find
    @report_expense = ReportExpense.find(params[:id])
  end

  # Paquete 06. En produccion el comprobante vive en S3 y hay que redirigir a una
  # URL firmada; en desarrollo, test y E2E vive en disco y hay que servirlo con
  # `send_file`. Se pregunta por el uploader y no por `Rails.env` para que el
  # entorno E2E (que corre en modo test con storage :file) tome la rama correcta.
  def remote_receipt_storage?
    ReceiptUploader.storage.to_s.include?("Fog")
  end

  # --- Captura asistida (paquete 10): privados de extract_receipt -----------

  # Etiquetas humanas para los avisos de baja confianza. Las claves son las del
  # SERVICIO (provider_name, value...), no las del formulario: low_confidence
  # viene con esos nombres.
  EXTRACTION_FIELD_LABELS = {
    "provider_name"  => "nombre del proveedor",
    "identification" => "NIT o cédula",
    "invoice_number" => "número de factura",
    "invoice_date"   => "fecha de la factura",
    "currency"       => "moneda",
    "value"          => "valor",
    "tax"            => "impuestos",
    "total"          => "total",
    "description"    => "descripción"
  }.freeze

  # Result del servicio -> [fields, warnings]. `fields` trae SIEMPRE las 15
  # claves de la whitelist del frontend (ReportExpenseIndex.js, handleExtract):
  # un nil deja el input vacio, una clave ausente no se pinta.
  #
  # Los COP SIEMPRE salen de multiplicar foreign * tasa (invariante 3 del
  # paquete 05), jamas al reves.
  def build_extraction_draft(result)
    f        = result.fields
    warnings = []
    fields   = {
      invoice_name:   f[:provider_name],
      identification: f[:identification],
      invoice_number: f[:invoice_number],
      invoice_date:   f[:invoice_date]&.iso8601,
      description:    f[:description],
      currency:       f[:currency],
      foreign_value: nil, foreign_tax: nil, foreign_total: nil,
      exchange_rate: nil, exchange_rate_date: nil, exchange_rate_source: nil,
      invoice_value: nil, invoice_tax: nil, invoice_total: nil
    }

    if f[:currency] == Currency::DEFAULT
      fields[:invoice_value] = monto_float(f[:value])
      fields[:invoice_tax]   = monto_float(f[:tax])
      fields[:invoice_total] = monto_float(f[:total])
    else
      fields[:foreign_value] = monto_str(f[:value])
      fields[:foreign_tax]   = monto_str(f[:tax])
      fields[:foreign_total] = monto_str(f[:total])
      aplicar_tasa_extraccion(fields, f, warnings)
    end

    f[:low_confidence].each do |clave|
      warnings << "Verifique el campo #{EXTRACTION_FIELD_LABELS.fetch(clave, clave)}: la lectura no es confiable"
    end

    [fields, warnings]
  end

  # La tasa se resuelve AQUI, fuera de todo lock, con el MISMO servicio del
  # boton manual: mismas fuentes, mismo cache y el mismo `source` literal
  # (trm_oficial/bce) que guarda /get_exchange_rate. Si la fuente no responde,
  # los COP quedan en nil y la persona captura la tasa a mano: nunca se inventa.
  def aplicar_tasa_extraccion(fields, f, warnings)
    fecha  = f[:invoice_date] || ExchangeRateService.today
    result = ExchangeRateService.fetch(currency: f[:currency], date: fecha)

    unless result.ok?
      warnings << "No se pudo obtener la tasa de #{f[:currency]} para el #{fecha}. Ingrésela manualmente"
      return
    end

    tasa = result.value
    fields[:exchange_rate]        = format("%.6f", tasa.rate_to_cop)
    fields[:exchange_rate_date]   = tasa.rate_date.iso8601
    fields[:exchange_rate_source] = tasa.source
    fields[:invoice_value]        = monto_cop(f[:value], tasa.rate_to_cop)
    fields[:invoice_tax]          = monto_cop(f[:tax], tasa.rate_to_cop)
    fields[:invoice_total]        = monto_cop(f[:total], tasa.rate_to_cop)

    return if tasa.rate_date == fecha

    warnings << "La tasa aplicada es la del #{tasa.rate_date} (último día hábil disponible)"
  end


  def monto_float(monto)
    monto.present? ? monto.round(2).to_f : nil
  end

  def monto_str(monto)
    monto.present? ? format("%.2f", monto) : nil
  end

  def monto_cop(monto, rate)
    monto.present? ? (monto * rate).round(2).to_f : nil
  end

  # RECORTE DE VISIBILIDAD DE LA LISTA DE GASTOS. Dueño unico de la pregunta
  # "¿que gastos alcanza este usuario?": lo llaman la tabla
  # (`get_report_expenses`), el Excel (`download_file`) y la aceptacion masiva
  # (`update_filter_values`). Estaba copiado en los tres, y el de aceptar es el
  # que no perdona: acepta por filtro, no por pagina.
  #
  # `get_cost_center_report_expenses` NO pasa por aqui a proposito: esa tabla
  # vive dentro de un centro de costo que el usuario ya abrio, y su recorte es
  # el centro, no la persona.
  #
  # Las TRES pestañas (`params[:scope]`):
  #
  # - sin valor / `all`: lo de siempre, decidido por el permiso "Ver todos".
  # - `mine`: los gastos cuyo responsable es el usuario.
  # - `owned_centers`: los gastos de los centros donde el usuario es el
  #   Propietario (`cost_centers.user_owner_id`). Es la UNICA que ensancha lo
  #   que alguien alcanza a ver —un lider sin "Ver todos" llega a gastos que no
  #   son suyos— y se deja a proposito: quien responde por el presupuesto de un
  #   centro tiene que poder ver lo que se le carga. No hay forma de pedir los
  #   gastos de un centro ajeno: el centro sale de `current_user`, nunca de un
  #   parametro.
  def apply_expense_scope(scope)
    case params[:scope]
    when "mine"
      scope.where(user_invoice_id: current_user.id)
    when "owned_centers"
      # Subconsulta y no `pluck`: con 400 centros el `IN (...)` explicito manda
      # 400 enteros en cada peticion de cada pagina.
      scope.where(cost_center_id: CostCenter.where(user_owner_id: current_user.id).select(:id))
    else
      # Sin pestaña —o con una que no existe— manda el permiso, igual que antes
      # de que hubiera pestañas.
      return scope if is_admin? || has_menu_permission?("Gastos", "Ver todos")

      scope.where(user_invoice_id: current_user.id)
    end
  end

  # Filtros de la pantalla de Gastos. La lista canonica vive en el modelo
  # (ReportExpense::SEARCH_KEYS); lo que no este ahi se descarta en silencio.
  def report_expense_search_filters
    params.permit(*ReportExpense::SEARCH_KEYS).to_h.symbolize_keys
  end

  # Los CUATRO filtros nuevos (moneda, estado presupuestal, aprobacion contable
  # y partida) se aplican AQUI y no dentro de `ReportExpense.search`.
  #
  # POR QUE: `ReportExpense.search` y `SEARCH_KEYS` tienen dueno unico paquete 03
  # (§7.2) y sus 6 call sites dependen de esa lista. Meterle cuatro columnas
  # nuevas obligaria a reabrir el refactor del 03. Es ademas el mismo camino que
  # ya tomo `AccountingExpensesController#filtered_scope` (paquete 06), que filtra
  # por `currency` y `budget_status` en el controller.
  #
  # `.present?` y NO `.nil?`: el string "false" es present?, asi que
  # `accounting_approved=false` (el filtro "pendientes por aprobar") sigue
  # llegando. Con `.reject(&:blank?)` sobre booleanos ese caso se pierde en
  # silencio y la pantalla muestra todo.
  def apply_expense_filters(scope)
    scope = scope.where(currency: params[:currency])                       if params[:currency].present?
    scope = scope.where(budget_status: params[:budget_status])             if params[:budget_status].present?
    scope = scope.where(accounting_approved: params[:accounting_approved]) if params[:accounting_approved].present?
    scope = scope.where(expense_budget_id: params[:expense_budget_id])     if params[:expense_budget_id].present?
    scope
  end

  # Buscador libre de las dos tablas de gastos. Incluye `id::text` para que pegar
  # el numero del registro en la caja de busqueda lo encuentre.
  def apply_free_text(scope)
    return scope if params[:q].blank?

    term = "%#{params[:q].to_s.downcase.strip}%"
    scope.where(
      "LOWER(report_expenses.invoice_name) LIKE :t OR LOWER(report_expenses.description) LIKE :t OR " \
      "LOWER(report_expenses.invoice_number) LIKE :t OR LOWER(report_expenses.identification) LIKE :t OR " \
      "CAST(report_expenses.id AS TEXT) LIKE :t",
      t: term
    )
  end

  # Orden con allowlist. `params[:sort]` entra a un `Arel.sql` sin escapar: todo
  # lo que no este en EXPENSE_SORT_COLUMNS ni sea uno de los dos alias con join
  # cae al orden por defecto.
  def order_expenses(scope)
    direction = params[:dir] == "asc" ? "ASC" : "DESC"

    if EXPENSE_SORT_COLUMNS.include?(params[:sort])
      scope.order(Arel.sql("report_expenses.#{params[:sort]} #{direction}"))
    elsif params[:sort] == "cost_center_code"
      scope.joins(:cost_center).order(Arel.sql("cost_centers.code #{direction}"))
    elsif params[:sort] == "user_invoice_name"
      scope.joins(:user_invoice).order(Arel.sql("users.names #{direction}"))
    else
      scope.order(created_at: :desc)
    end
  end

  # Campos que el USUARIO puede escribir.
  #
  # 🔴 PROHIBIDO agregar, ni ahora ni nunca: :budget_status, :budget_reason,
  # :expense_budget_id, :accounting_approved, :accounting_approved_by_id,
  # :accounting_approved_at. Los escribe el servidor (ExpenseBudgetService y
  # AccountingExpensesController). Permitirlos deja fabricarse una aprobacion
  # presupuestal o contable desde el body de la peticion.
  #
  # `:receipt_file` y `:remove_receipt_file` son de ESTE paquete (§7.2): sin
  # ellos el POST multipart no guarda el comprobante que monto el paquete 06.
  # `:cop_manual_override` tambien: sin el, el ajuste manual del COP que el
  # usuario hace en el formulario se sobrescribe en silencio en cada save
  # (regla D2 del paquete 05).
  EXPENSE_WRITABLE_PARAMS = [
    :cost_center_id, :user_invoice_id, :invoice_name, :invoice_date, :description,
    :invoice_number, :invoice_type, :identification, :invoice_value, :invoice_tax,
    :invoice_total, :type_identification_id, :payment_type_id,
    :receipt_file, :remove_receipt_file,
    :currency, :foreign_value, :foreign_tax, :foreign_total,
    :exchange_rate, :exchange_rate_date, :exchange_rate_source, :cop_manual_override
  ].freeze

  def report_expense_params_create
    defaults = { user_id: current_user.id }
    params.permit(:user_id, *EXPENSE_WRITABLE_PARAMS).reverse_merge(defaults)
  end

  def report_expense_params_update
    params.permit(*EXPENSE_WRITABLE_PARAMS)
  end
end

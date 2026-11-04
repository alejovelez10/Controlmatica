class CostCentersController < ApplicationController
  before_action :set_cost_center, only: [:show, :edit, :update, :destroy, :cost_center_customer, :get_show_center]
  before_action :set_sales_order, only: [:show]
  before_action :authenticate_user!
  include ApplicationHelper
  include CostCentersHelper
  include ExcelXls

  # GET /cost_centers
  # GET /cost_centers.json
  def index
    # Data is loaded via get_cost_centers API endpoint, not here
    permissions = load_permissions("Centro de Costos",
      "Crear", "Editar", "Eliminar", "Gestionar modulo", "Finalizar",
      "Descargar excel", "Forzar estados", "Ver horas costo", "Editar todos",
      "Finalizar compras", "Editar codigo"
    )

    @hours_real = Parameterization.where(name: "HORA HOMBRE COSTO").first.money_value
    @hours_invoices = Parameterization.where(name: "HORA HOMBRE COTIZADA").first.money_value
    @hours_real_contractor = Parameterization.where(name: "HORA TABLERISTA COSTO").first.money_value
    @value_displacement_hours = Parameterization.where(name: "HORA DESPLAZAMIENTO").first.money_value

    @estados = {
      create: permissions["Crear"],
      edit: permissions["Editar"],
      edit_all: permissions["Editar todos"],
      delete: permissions["Eliminar"],
      manage_module: permissions["Gestionar modulo"],
      ending: permissions["Finalizar"],
      download_file: permissions["Descargar excel"],
      update_state: permissions["Forzar estados"],
      show_hours: permissions["Ver horas costo"],
      state_update: permissions["Forzar estados"],
      sales_state: permissions["Finalizar compras"],
      edit_code: permissions["Editar codigo"],
    }
  end

  def search_autocomplete
    query = params[:q].to_s.strip
    if query.length < 2
      render json: [] and return
    end

    term = "%#{query}%"
    results = CostCenter.where("code ILIKE ? OR description ILIKE ?", term, term)
    results = results.where(customer_id: params[:customer_id]) if params[:customer_id].present?
    results = results.where.not(execution_state: "FINALIZADO") if params[:exclude_finalized] == "true"
    results = results.select(:id, :code, :description).limit(15)

    render json: results.map { |cc| { id: cc.id, label: "#{cc.code} - (#{cc.description})" } }
  end

  def get_cost_center_details
    cc = CostCenter.includes(:customer, :contact, :user_owner).find(params[:id])
    render json: {
      id: cc.id,
      code: cc.code,
      description: cc.description,
      customer_id: cc.customer_id,
      contact_id: cc.contact_id,
      user_owner_id: cc.user_owner_id,
      customer: cc.customer ? { id: cc.customer.id, name: cc.customer.name } : nil,
      contact: cc.contact ? { id: cc.contact.id, name: cc.contact.name } : nil,
      user_owner: cc.user_owner ? { id: cc.user_owner.id, names: cc.user_owner.names } : nil
    }
  end

  def get_cost_centers
    per_page = [(params[:per_page] || 30).to_i, 100].min
    page = (params[:page] || 1).to_i

    filtrados = filtered_cost_centers
    cost_centers_total = filtrados.count
    cost_centers = sorted_cost_centers(filtrados)
      .includes(:customer, :contact, :user, :user_owner, :last_user_edited, :sales_orders)
      .paginate(page: page, per_page: per_page)

    total_pages = (cost_centers_total.to_f / per_page).ceil

    render json: {
      cost_centers_paginate: get_cost_centers_items(cost_centers),
      cost_centers_total: cost_centers_total,
      meta: {
        page: page,
        per_page: per_page,
        total: cost_centers_total,
        total_pages: total_pages
      }
    }
  end

  def update_sales_state_cost_center
    centro = CostCenter.find(params[:id])

    if params[:state] == "CERRADO"
      if centro.materials.any?
        count_states = centro.materials.where(sales_state: "INGRESADO TOTAL").count
        total = centro.materials.count

        if count_states == total
          message = "¡El Registro fue actualizado con exito!"
          type = "success"
          update_centro = centro.update(sales_state: params[:state])
        else
          message = "No se puede cerrar por que hay materiales sin ingresado total"
          type = "error"
          update_centro = true
        end
      else
        message = "¡El Registro fue actualizado con exito!"
        type = "success"
        update_centro = centro.update(sales_state: params[:state])
      end
    else
      message = "¡El Registro fue actualizado con exito!"
      type = "success"
      update_centro = centro.update(sales_state: params[:state])
    end

    if update_centro
      render :json => {
        success: message,
        register: get_cost_centers_item(centro),
        type: type,
      }
    end
  end

  def update_state_centro
    cost_center = CostCenter.find(params[:id])

    if params[:from] == "execution_state"
      update_centro = cost_center.update(execution_state: params[:state])
    else
      update_centro = cost_center.update(invoiced_state: params[:state])
    end

    if update_centro
      render :json => {
        message: "¡El Registro fue Actualizado con exito!",
        register: get_cost_centers_item(cost_center),
        type: "success",
      }
    end
  end

  # GET /cost_centers/1
  # GET /cost_centers/1.json
  def show
    cc_perms = load_permissions("Centro de Costos", "Editar", "Forzar estados", "Ver horas costo")
    mat_perms = load_permissions("Materiales", "Crear", "Editar", "Eliminar", "Descargar excel", "Forzar estados", "Editar todos")

    @estados = {
      update_state: cc_perms["Forzar estados"],
      show_hours: cc_perms["Ver horas costo"],
      create_materials: mat_perms["Crear"],
      edit_materials: mat_perms["Editar"],
      edit_all_materials: mat_perms["Editar todos"],
      delete_materials: mat_perms["Eliminar"],
      update_state_materials: mat_perms["Forzar estados"],
      download_file_materials: mat_perms["Descargar excel"],
      cost_center_edit: cc_perms["Editar"],
    }

    # Las 10 CLAVES CANONICAS de 00-ARQUITECTURA.md 4.4. Los nombres son
    # contrato: React las lee por string literal, asi que `budget_view` o
    # `is_cost_center_owner` (las dos variantes derogadas) dejarian la pestana
    # Presupuesto invisible para siempre sin que nada falle.
    #
    # `is_center_owner` no es un permiso sino una propiedad del negocio, y es
    # indispensable: sin ella el frontend no distingue "puede administrar
    # partidas por ser dueno del centro" de "puede por permiso global", y
    # pintaria botones que el servidor rechaza con 403.
    #
    # Los cuatro `expense_*` existen para que el paquete 08 pueda borrar el
    # `estados` hardcodeado en true de ExpensesTable.jsx.
    #
    # Todos los flags son COSMETICOS: el servidor revalida en cada endpoint.
    @estados = @estados.merge(
      budget_module: has_menu_permission?("Presupuesto de gastos", "Ingreso al modulo"),
      budget_create: has_menu_permission?("Presupuesto de gastos", "Crear"),
      budget_edit: has_menu_permission?("Presupuesto de gastos", "Editar"),
      budget_delete: has_menu_permission?("Presupuesto de gastos", "Eliminar"),
      budget_show_all: has_menu_permission?("Presupuesto de gastos", "Ver todos"),
      is_center_owner: @cost_center.user_owner_id == current_user.id,
      expense_create: is_admin? || has_menu_permission?("Gastos", "Crear"),
      expense_edit: is_admin? || has_menu_permission?("Gastos", "Editar"),
      expense_delete: is_admin? || has_menu_permission?("Gastos", "Eliminar"),
      expense_show_all: is_admin? || has_menu_permission?("Gastos", "Ver todos"),
      # No es un permiso: es el flag EXPENSE_RECEIPT_REQUIRED, para que el
      # formulario marque el campo y corte antes de subir. Quien rechaza de
      # verdad es el modelo.
      receipt_required: ReportExpense.comprobante_obligatorio?,
      # Tipos que no exigen comprobante aunque el flag este encendido (viaticos).
      receipt_optional_type_ids: ReportExpenseOption.ids_sin_comprobante,
      # Tipos de viatico: el formulario propone en "Nombre" a la persona
      # responsable, porque un viatico no lo factura un proveedor.
      viatic_type_ids: ReportExpenseOption.ids_viaticos,
    )

    @customer_invoice = CustomerInvoice.where(cost_center_id: @cost_center.id)
  end

  def customer_cost_center
    customer = Customer.find(params[:id])
    centro = CostCenter.where(customer_id: customer.id)
    report = Report.where(customer_id: customer.id)

    render :json => {
      data_cost_center: centro,
      data_contact: customer.contacts,
    }
  end

  def get_show_center
    ing_cotizado = @cost_center.engineering_value
    ing_real = @cost_center.reports.sum(:working_value)
    via_cotizado = @cost_center.viatic_value

    report_sums = @cost_center.reports.pick(
      Arel.sql("COALESCE(SUM(viatic_value), 0)"),
      Arel.sql("COALESCE(SUM(working_time), 0)"),
      Arel.sql("COALESCE(SUM(value_displacement_hours), 0)"),
      Arel.sql("COALESCE(SUM(displacement_hours), 0)")
    )
    report_viatic_sum, horas_eje, ejecutado_desplazamiento, ejecutado_desplazamiento_horas = report_sums

    # MISMO SCOPE que `recalculate_cost_center` (application_helper.rb): si esta
    # pantalla sumara los rechazados y el recalculo no, el centro mostraria un
    # viatico ejecutado distinto del que tiene guardado, y nadie sabria cual
    # creer.
    expense_sum = @cost_center.report_expenses.suman_en_centro.sum(:invoice_value)
    via_real = report_viatic_sum + expense_sum

    porc_eje = (@cost_center.eng_hours || 0) > 0 ? (((horas_eje.to_f / @cost_center.eng_hours)) * 100).round(1) : "N/A"

    cotizado_desplazamiento = (@cost_center.value_displacement_hours || 0) * (@cost_center.displacement_hours || 0)

    porc_desplazamiento = (@cost_center.displacement_hours || 0) > 0 ? (((ejecutado_desplazamiento_horas.to_f / @cost_center.displacement_hours)) * 100).round(1) : "N/A"
    if !@cost_center.has_many_quotes
      costo_en_dinero = ((@cost_center.hour_cotizada || 0) * (@cost_center.eng_hours || 0)).round(1) + cotizado_desplazamiento
    else
      costo_en_dinero = @cost_center.quotations.sum(:engineering_value) + cotizado_desplazamiento
    end
    costo_real_en_dinero = ((@cost_center.hour_real || 0) * horas_eje).to_i + ejecutado_desplazamiento
    porc_eje_costo = costo_en_dinero > 0 ? (((1 - (costo_real_en_dinero.to_f / costo_en_dinero)) * 100)).round(1) : "N/A"

    hours_eje_contractor = @cost_center.contractors.sum(:hours)
    facturacion = @cost_center.customer_invoices.sum(:invoice_value)

    porc_eje_contractor = (@cost_center.hours_contractor || 0) > 0 ? (((hours_eje_contractor.to_f / @cost_center.hours_contractor)) * 100).round(1) : "N/A"

    costo_real_en_dinero_contractor = ((@cost_center.hours_contractor_real || 0) * hours_eje_contractor).round(1)
    costo_en_dinero_contractor = ((@cost_center.hours_contractor_invoices || 0) * (@cost_center.hours_contractor || 0)).round(1)

    porc_eje_costo_contractor = costo_en_dinero_contractor > 0 ? (((1 - (costo_real_en_dinero_contractor.to_f / costo_en_dinero_contractor)) * 100)).round(1) : "N/A"

    porc_via = (via_cotizado || 0) > 0 ? ((via_real.to_f / via_cotizado) * 100).round(1) : "N/A"

    porc_fac = (@cost_center.quotation_value || 0) > 0 ? ((facturacion.to_f / @cost_center.quotation_value) * 100).round(1) : "N/A"

    total_eje = (@cost_center.hour_real || 0) * horas_eje
    total_cot = (@cost_center.hour_cotizada || 0) * horas_eje
    total_margen = total_cot - total_eje
    porc_ejec = total_cot > 0 ? ((total_margen.to_f / total_cot) * 100).round(1) : "N/A"

    cost_center = @cost_center.to_json(:include => { :customer => { :only => [:name] }, :contact => { :only => [:name] }, :user_owner => { :only => [:names, :id] }, :last_user_edited => { :only => [:names, :id] }, :user => { :only => [:names, :id] } })

    sum_materials = @cost_center.materials.sum(:amount)
    porc_mat = (@cost_center.materials_value != nil ? @cost_center.materials_value : 0) > 0 ? ((1 - (sum_materials.to_f / @cost_center.materials_value)) * 100).round(1) : "N/A"
    sum_contractors = @cost_center.contractors.sum(:ammount)

    cost_center = JSON.parse(cost_center)

    render :json => {
      data_show: cost_center,
      data_orders: @cost_center.sales_orders,

      horas_eje: horas_eje,
      porc_eje: porc_eje,

      via_cotizado: via_cotizado,
      via_real: via_real,
      porc_via: porc_via,

      porc_eje_contractor: porc_eje_contractor,
      hours_eje_contractor: hours_eje_contractor,
      hours_contractor: @cost_center.hours_contractor,

      costo_en_dinero_contractor: costo_en_dinero_contractor,
      costo_real_en_dinero_contractor: costo_real_en_dinero_contractor,
      porc_eje_costo_contractor: porc_eje_costo_contractor,

      ejecutado_desplazamiento_horas: ejecutado_desplazamiento_horas,
      porc_desplazamiento: porc_desplazamiento,

      costo_en_dinero: costo_en_dinero,
      costo_real_en_dinero: costo_real_en_dinero,
      porc_eje_costo: porc_eje_costo,

      facturacion: facturacion,
      porc_fac: porc_fac,
      sum_materials: sum_materials,
      sum_contractors: sum_contractors,

      porc_mat: (porc_mat != nil ? porc_mat : 0),
    }
  end

  def getValues
    cost_center = CostCenter.includes(:sales_orders, :reports, :contractors, :materials, :report_expenses).find(params[:id])
    sales_ordes = cost_center.sales_orders.to_json(:include => { :cost_center => { :include => :customer, :only => [:code, :invoiced_state] }, :customer_invoices => { :only => [:invoice_value, :invoice_date, :number_invoice] } })
    reportes = cost_center.reports.to_json(:include => { :cost_center => { :include => :customer, :only => [:code, :description] }, :customer => { :only => [:name] }, :contact => { :only => [:name] }, :report_execute => { :only => [:names] } })
    contractors = cost_center.contractors.to_json(:include => { :cost_center => { :only => [:code] }, :user_execute => { :only => [:names] } })
    materiales = cost_center.materials.to_json(:include => { :cost_center => { :only => [:code] }, :provider => { :only => [:name] }, :material_invoices => { :only => [:number, :value, :observation] } })
    dataExpenses = cost_center.report_expenses

    sales_ordes = JSON.parse(sales_ordes)
    reportes = JSON.parse(reportes)
    contractors = JSON.parse(contractors)
    materiales = JSON.parse(materiales)

    values = {
      dataMateriales: materiales,
      dataContractors: contractors,
      dataSalesOrdes: sales_ordes,
      dataReports: reportes,
      dataExpenses: ActiveModelSerializers::SerializableResource.new(dataExpenses, each_serializer: ReportExpenseSerializer),
    }
    render :json => values
  end

  # GET /cost_centers/new
  def new
    @cost_center = CostCenter.new
  end

  # GET /cost_centers/1/edit
  def edit
  end

  # POST /cost_centers
  # POST /cost_centers.json

  def create
    cleaned = clean_money_params(cost_center_params_create,
      :viatic_value, :quotation_value, :hour_real, :hour_cotizada,
      :hours_contractor_real, :hours_contractor_invoices, :materials_value,
      :displacement_hours, :value_displacement_hours
    )

    cost_center = CostCenter.create(cleaned)

    if cost_center.save
      render :json => {
               message: "¡El Registro fue creado con exito!",
               register: get_cost_centers_item(cost_center),
               type: "success",
             }
    else
      render :json => {
               message: "¡El Registro no fue creado!",
               type: "error",
               message_error: cost_center.errors.full_messages,
             }
    end
  end

  def get_info_cost_center
    cost_center = CostCenter.find(params[:cost_center_id])
    user = User.find(params[:user_id])
    hours = cost_center.reports.where(report_execute_id: user.id).sum(:working_time)
    hours_cost = cost_center.eng_hours
    hours_paid = cost_center.commissions.where(user_invoice_id: user.id).where.not(id: params[:id]).sum(:hours_worked)

    if params[:invoice_id]
      invoice = CustomerInvoice.find(params[:invoice_id])
      engineering_value = invoice.engineering_value > 0
    end

    if params[:start_date] != "" && params[:end_date] != ""
      render :json => {
               customer_invoices: cost_center.customer_invoices.where("invoice_date >= ?", params[:start_date]).where("invoice_date <= ?", params[:end_date]),
               customer_reports: cost_center.customer_reports,
               value_hour: cost_center.hour_cotizada,
               hours_worked_code: hours,
               hours_cost: hours_cost,
               hours_paid: hours_paid,
               engineering_value: engineering_value
             }
    else
      render :json => {
               customer_invoices: [],
               customer_reports: [],
               value_hour: 0,
               hours_worked_code: 0,
               hours_paid: 0,
               hours_cost: 0,
               engineering_value: false
             }
    end
  end

  def get_info_inovoice
    invoice = CustomerInvoice.find(params[:invoice_id])

    render :json => {
      engineering_value: invoice.engineering_value > 0,
    }
  end

  # Las columnas de la tabla en el mismo orden, con cada indicador desglosado
  # (cotizado / ejecutado / %), y al final propietario y fechas del centro.
  # Antes salian 12 columnas y dos leian campos que ya nadie actualiza
  # (sum_executed siempre en 0, sum_viatic sin los gastos): "sale mocho"
  # (David, 3-nov-2026). El orden tiene que calzar con fila_excel_centro.
  ENCABEZADOS_EXCEL = [
    "Código", "Cliente", "Tipo", "Descripción", "Estado compras", "Estado de ejecución",
    "Estado facturado", "Número de cotización",
    "Ingeniería: horas cotizadas", "Ingeniería: horas ejecutadas", "Ingeniería: % avance",
    "Ingeniería: $ cotizado", "Ingeniería: $ costo", "Ingeniería: % margen",
    "Tableristas: horas cotizadas", "Tableristas: horas ejecutadas", "Tableristas: % avance",
    "Tableristas: $ cotizado", "Tableristas: $ costo", "Tableristas: % margen",
    "Desplazamiento: horas cotizadas", "Desplazamiento: horas ejecutadas", "Desplazamiento: % ejecución",
    "Materiales: $ cotizados", "Materiales: $ comprados", "Materiales: % margen",
    "Viáticos: $ cotizado", "Viáticos: $ gastado", "Viáticos: % avance",
    "Facturación: $ cotizado", "Facturación: $ facturado", "Facturación: % avance",
    "AIU actual: $", "AIU actual: %", "AIU cotizado: $", "AIU cotizado: %",
    "$ Total legalizado", "$ Total cotizado",
    "Fecha de creación", "Creado por", "Última actualización", "Actualizado por",
    "Propietario", "Fecha de inicio", "Fecha de fin"
  ].freeze

  # La misma consulta que la tabla (get_cost_centers), sin paginar: el
  # frontend manda los mismos parametros con que cargo la tabla.
  def download_file
    centros = sorted_cost_centers(filtered_cost_centers)
      .includes(:customer, :user, :user_owner, :last_user_edited, :sales_orders)

    respond_to do |format|
      format.xls do
        filas = centros.map { |centro| fila_excel_centro(centro) }
        send_data(xls_libro(ENCABEZADOS_EXCEL, filas, anchos: { "Descripción" => 60 }),
                  :filename => "Centro_de_Costo.xls", :disposition => "inline")
      end
    end
  end

  # PATCH/PUT /cost_centers/1
  # PATCH/PUT /cost_centers/1.json
  def update
    cleaned = clean_money_params(cost_center_params_update,
      :viatic_value, :quotation_value, :hour_real, :hour_cotizada,
      :hours_contractor_real, :hours_contractor_invoices, :materials_value,
      :displacement_hours, :value_displacement_hours
    )

    if @cost_center.update(cleaned.merge(update_user: current_user.id))
      recalculate_cost_center(@cost_center.id)
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        register: get_cost_centers_item(@cost_center),
        type: "success",
      }
    else
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @cost_center.errors.full_messages,
      }
    end
  end

  # DELETE /cost_centers/1
  # DELETE /cost_centers/1.json
  def destroy
    message = []

    materials = @cost_center.materials.count
    sales_orders = @cost_center.sales_orders.count
    contractors = @cost_center.contractors.count
    shifts = @cost_center.shifts.count
    reports_expenses = @cost_center.report_expenses.count
    reports = @cost_center.reports.count

    if materials >= 1
      message << "#{materials} #{materials == 1 ? 'Material' : 'Materiales'}  </b> "
    end

    if sales_orders >= 1
      message << "#{sales_orders} #{sales_orders == 1 ? 'Orden de compra' : 'Ordenes de compra'} </b> "
    end

    if contractors >= 1
      message << "#{contractors} #{shifts == 1 ? 'Tablerista' : 'Tableristas'} </b>  "
    end

    if shifts >= 1
      message << "#{shifts} #{shifts == 1 ? 'Turno' : 'Turnos'} </b>  "
    end

    if reports_expenses >= 1
      message << "#{reports_expenses} #{reports_expenses == 1 ? 'Reporte de gastos' : 'Reportes de gastos'} </b>  "
    end

    if reports >= 1
      message << "#{reports} #{reports == 1 ? 'Reporte de servicio' : 'Reportes de servicios'} </b>  "
    end

    if materials >= 1 || sales_orders >= 1 || contractors >= 1 || shifts >= 1 || reports_expenses >= 1 || reports >= 1
      render :json => {
        message: message,
        type: "error"
      }
    else
      if @cost_center.destroy
        render :json => {
          type: "delete"
        }
      end
    end
  end

  def change_state_ended
    @cost_center = CostCenter.find(params[:id])
    state = @cost_center.invoiced_state == "LEGALIZADO" ? "POR FACTURAR" : @cost_center.invoiced_state
    @fac = @cost_center.invoiced_state == "LEGALIZADO" ? true : false

    update_status = @cost_center.update(execution_state: "FINALIZADO", invoiced_state: state)

    if update_status
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        type: "success",
        register: get_cost_centers_item(@cost_center),
      }
    end
  end

  private

  # Use callbacks to share common setup or constraints between actions.
  def set_cost_center
    @cost_center = CostCenter.find(params[:id])
  end

  def set_sales_order
  end

  # Mismo helper memoizado que ReportExpensesController#is_admin?. El patron de
  # lectura de permisos del proyecto (00-ARQUITECTURA.md 4.4) es siempre
  # `is_admin? || has_menu_permission?(...)`, y `load_permissions` de abajo no
  # sirve para eso porque resuelve un solo modulo por llamada.
  def is_admin?
    @_is_admin ||= current_user.rol.name == "Administrador"
  end

  # Load permissions for a module in 1 query instead of N queries
  COLUMNAS_ORDENABLES = %w[code description service_type execution_state invoiced_state start_date created_at quotation_number customer_id sales_state].freeze

  # Centros que ve el usuario, con los filtros y la busqueda de la tabla.
  # Lo comparten la tabla (get_cost_centers) y el Excel (download_file).
  # `ids == "filtro"` es la URL vieja del Excel, que no mandaba filtering=true.
  def filtered_cost_centers
    permissions = load_permissions("Centro de Costos", "Ver todos")
    scope = permissions["Ver todos"] ? CostCenter.all : CostCenter.where(user_id: current_user.id)

    if params[:filtering] == "true" || params[:ids] == "filtro"
      scope = scope.search(
        params[:descripcion], params[:customer_id], params[:execution_state],
        params[:invoiced_state], params[:cost_center_id], params[:service_type],
        params[:date_desde], params[:date_hasta], params[:quotation_number]
      )
    end

    scope
  end

  def sorted_cost_centers(scope)
    sort_column = params[:sort_column].presence || "created_at"
    sort_column = "created_at" unless COLUMNAS_ORDENABLES.include?(sort_column)
    sort_direction = params[:sort_direction] == "asc" ? :asc : :desc
    scope.order(sort_column => sort_direction)
  end

  # Una fila del Excel de centros de costo, en el orden de ENCABEZADOS_EXCEL.
  # Los valores son los mismos que pinta la tabla (get_cost_centers_item);
  # "Ingeniería: $ cotizado" usa la misma suma que la pantalla (valor de
  # ingeniería + horas de desplazamiento por su valor).
  def fila_excel_centro(c)
    [
      c.code, c.customer&.name, c.service_type, c.description, c.sales_state, c.execution_state,
      c.invoiced_state, c.quotation_number,
      c.eng_hours, c.ing_horas_eje, c.ing_horas_porcentaje,
      c.engineering_value.to_f + (c.displacement_hours.to_f * c.value_displacement_hours.to_f), c.ing_costo_real, c.ing_costo_porcentaje,
      c.hours_contractor, c.cont_horas_eje, c.cont_horas_porcentaje,
      c.work_force_contractor, c.cont_costo_real, c.cont_costo_porcentaje,
      c.displacement_hours, c.desp_horas_eje, c.desp_horas_porcentaje,
      c.materials_value, c.mat_costo_real, c.mat_costo_porcentaje,
      c.viatic_value, c.viat_costo_real, c.viat_costo_porcentaje,
      c.quotation_value, c.fact_real, c.fact_porcentaje,
      c.aiu, c.aiu_percent, c.aiu_real, c.aiu_percent_real,
      c.sales_orders.sum { |so| so.order_value.to_f }, c.quotation_value,
      xls_fecha_local(c.created_at), c.user&.names, xls_fecha_local(c.updated_at), c.last_user_edited&.names,
      c.user_owner&.names, c.start_date, c.end_date
    ]
  end

  def load_permissions(module_name, *action_names)
    is_admin = current_user.rol.name == "Administrador"
    return action_names.each_with_object({}) { |name, h| h[name] = true } if is_admin

    mod = ModuleControl.find_by_name(module_name)
    return action_names.each_with_object({}) { |name, h| h[name] = false } unless mod

    existing = current_user.rol.accion_modules.where(module_control_id: mod.id, name: action_names).pluck(:name)
    action_names.each_with_object({}) { |name, h| h[name] = existing.include?(name) }
  end

  # Clean money formatting from params
  def clean_money_params(permitted_params, *fields)
    result = permitted_params.to_h
    fields.each do |field|
      key = field.to_s
      val = result[key]
      next unless val.present?
      next if val.is_a?(Numeric)
      result[key] = val.to_s.gsub(/[$,]/, "")
    end
    result
  end

  # Never trust parameters from the scary internet, only allow the white list through.

  def cost_center_params_create
    defaults = { user_id: current_user.id }
    params.permit(:customer_id, :contact_id, :user_id, :description, :start_date, :end_date, :quotation_number, :engineering_value, :viatic_value, :execution_state, :invoiced_state, :service_type, :code, :count, :eng_hours, :hour_cotizada, :hour_real, :quotation_value, :user_id, :work_force_contractor, :hours_contractor_invoices, :hours_contractor_real, :materials_value, :hours_contractor, :displacement_hours, :value_displacement_hours, :offset_value, :update_user, :user_owner_id, :sales_state).reverse_merge(defaults)
  end

  def cost_center_params_update
    params.permit(:customer_id, :contact_id, :description, :start_date, :end_date, :quotation_number, :engineering_value, :viatic_value, :execution_state, :invoiced_state, :service_type, :code, :count, :eng_hours, :hour_cotizada, :hour_real, :quotation_value, :work_force_contractor, :hours_contractor_invoices, :hours_contractor_real, :materials_value, :hours_contractor, :displacement_hours, :value_displacement_hours, :offset_value, :update_user, :user_owner_id, :sales_state)
  end
end

class CostCentersController < ApplicationController
  before_action :set_cost_center, only: [:show, :edit, :update, :destroy, :cost_center_customer, :get_show_center]
  before_action :set_sales_order, only: [:show]
  before_action :authenticate_user!
  include ApplicationHelper
  include CostCentersHelper

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
    if query.length < 3
      render json: [] and return
    end

    term = "%#{query}%"
    results = CostCenter.where("code ILIKE ? OR description ILIKE ?", term, term)
                        .select(:id, :code, :description)
                        .limit(15)

    render json: results.map { |cc| { id: cc.id, label: "#{cc.code} - (#{cc.description})" } }
  end

  def get_cost_centers
    permissions = load_permissions("Centro de Costos", "Ver todos")
    validate = permissions["Ver todos"]

    per_page = (params[:per_page] || 10).to_i
    page = (params[:page] || 1).to_i
    sort_column = params[:sort_column].presence || "created_at"
    sort_direction = params[:sort_direction] == "asc" ? "asc" : "desc"

    allowed_sort_columns = %w[code description service_type execution_state invoiced_state start_date created_at quotation_number customer_id sales_state]
    sort_column = "created_at" unless allowed_sort_columns.include?(sort_column)

    base_scope = validate ? CostCenter.all : CostCenter.where(user_id: current_user.id)

    if params[:filtering] == "true"
      base_scope = base_scope.search(
        params[:descripcion], params[:customer_id], params[:execution_state],
        params[:invoiced_state], params[:cost_center_id], params[:service_type],
        params[:date_desde], params[:date_hasta], params[:quotation_number]
      )
    end

    cost_centers_total = base_scope.count
    cost_centers = base_scope
      .includes(:customer, :contact, :user, :user_owner, :last_user_edited, :sales_orders)
      .order(sort_column => sort_direction.to_sym)
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

    expense_sum = @cost_center.report_expenses.sum(:invoice_value)
    via_real = report_viatic_sum + expense_sum

    porc_eje = @cost_center.eng_hours > 0 ? (((horas_eje.to_f / @cost_center.eng_hours)) * 100).round(1) : "N/A"

    cotizado_desplazamiento = @cost_center.value_displacement_hours * @cost_center.displacement_hours

    porc_desplazamiento = @cost_center.displacement_hours > 0 ? (((ejecutado_desplazamiento_horas.to_f / @cost_center.displacement_hours)) * 100).round(1) : "N/A"
    if !@cost_center.has_many_quotes
      costo_en_dinero = (@cost_center.hour_cotizada * @cost_center.eng_hours).round(1) + cotizado_desplazamiento
    else
      costo_en_dinero = @cost_center.quotations.sum(:engineering_value) + cotizado_desplazamiento
    end
    costo_real_en_dinero = (@cost_center.hour_real * horas_eje).to_i + ejecutado_desplazamiento
    porc_eje_costo = costo_en_dinero > 0 ? (((1 - (costo_real_en_dinero.to_f / costo_en_dinero)) * 100)).round(1) : "N/A"

    hours_eje_contractor = @cost_center.contractors.sum(:hours)
    facturacion = @cost_center.customer_invoices.sum(:invoice_value)

    porc_eje_contractor = @cost_center.hours_contractor > 0 ? (((hours_eje_contractor.to_f / @cost_center.hours_contractor)) * 100).round(1) : "N/A"

    costo_real_en_dinero_contractor = (@cost_center.hours_contractor_real * hours_eje_contractor).round(1)
    costo_en_dinero_contractor = (@cost_center.hours_contractor_invoices * @cost_center.hours_contractor).round(1)

    porc_eje_costo_contractor = costo_en_dinero_contractor > 0 ? (((1 - (costo_real_en_dinero_contractor.to_f / costo_en_dinero_contractor)) * 100)).round(1) : "N/A"

    porc_via = via_cotizado > 0 ? ((via_real.to_f / via_cotizado) * 100).round(1) : "N/A"

    porc_fac = @cost_center.quotation_value > 0 ? ((facturacion.to_f / @cost_center.quotation_value) * 100).round(1) : "N/A"

    total_eje = @cost_center.hour_real * horas_eje
    total_cot = @cost_center.hour_cotizada * horas_eje
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

  def download_file
    permissions = load_permissions("Centro de Costos", "Ver todos")
    validate = permissions["Ver todos"]

    if validate
      if params[:ids] == "filtro"
        centro_show = CostCenter.search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state], params[:cost_center_id], params[:service_type], params[:date_desde], params[:date_hasta], params[:quotation_number])
      else
        centro_show = CostCenter.all
      end
    else
      if params[:ids] == "filtro"
        centro_show = CostCenter.where(user_id: current_user.id).search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state], params[:cost_center_id], params[:service_type], params[:date_desde], params[:date_hasta], params[:quotation_number])
      else
        centro_show = CostCenter.where(user_id: current_user.id)
      end
    end

    respond_to do |format|
      format.xls do
        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet

        rows_format = Spreadsheet::Format.new color: :black,
                                              weight: :normal,
                                              size: 13,
                                              align: :left

        centro_show.each.with_index(1) do |task, i|
          position = sheet.row(i)

          sheet.row(1).default_format = rows_format
          position[0] = task.code
          position[1] = task.customer.present? ? task.customer.name : ""
          position[2] = task.service_type
          position[3] = task.description
          position[4] = task.quotation_number

          position[5] = task.engineering_value
          position[6] = task.sum_executed
          position[7] = task.viatic_value
          position[8] = task.sum_viatic
          position[9] = get_state_center(task)
          position[10] = task.execution_state
          position[11] = task.invoiced_state

          sheet.row(i).height = 25
          sheet.column(i).width = 40
          sheet.row(i).default_format = rows_format
        end

        head_format = Spreadsheet::Format.new color: :white,
                                              weight: :bold,
                                              size: 12,
                                              pattern_bg_color: :xls_color_10,
                                              pattern: 2,
                                              vertical_align: :middle,
                                              align: :left

        position = sheet.row(0)

        position[0] = "Codigo"
        position[1] = "Cliente"
        position[2] = "Tipo"
        position[3] = "Descripcion"
        position[4] = "Número de cotización"
        position[5] = "$ Ingeniería Cotizado"
        position[6] = "$ Ingeniería Ejecutado"
        position[7] = "$ Viaticos Cotizado"
        position[8] = "$ Viaticos Real"
        position[9] = "¿Finalizo?"
        position[10] = "Estado de ejecución"
        position[11] = "Estado facturado"

        sheet.row(0).height = 20
        (0..11).each { |col| sheet.column(col).width = 40 }
        sheet.column(11).width = 45

        sheet.row(0).each.with_index { |c, i| sheet.row(0).set_format(i, head_format) }

        temp_file = StringIO.new

        task.write(temp_file)

        send_data(temp_file.string, :filename => "Centro_de_Costo.xls", :disposition => "inline")
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

  # Load permissions for a module in 1 query instead of N queries
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

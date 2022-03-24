class ReportsController < ApplicationController
  before_action :set_report, only: [:show, :edit, :update, :destroy]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token
  include ApplicationHelper
  include ActionView::Helpers::NumberHelper
  include ReportsHelper

  # GET /reports
  # GET /reports.json
  def index
    reports = ModuleControl.find_by_name("Reportes de servicios")
    create = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Eliminar").exists?
    responsible = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Ver Responsables").exists?
    download_file = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Descargar excel").exists?
    edit_all = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Editar todos").exists?
    viatics = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Ingresar viaticos").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      edit_all: (current_user.rol.name == "Administrador" ? true : edit_all),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      responsible: (current_user.rol.name == "Administrador" ? true : responsible),
      download_file: (current_user.rol.name == "Administrador" ? true : download_file),
      viatics: (current_user.rol.name == "Administrador" ? true : viatics)
    }
  end

  # GET /reports/1
  # GET /reports/1.json
  def show
  end

  # GET /reports/new
  def new
    @report = Report.new
  end

  def get_reports
    report = ModuleControl.find_by_name("Reportes de servicios")
    estado = current_user.rol.accion_modules.where(module_control_id: report.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)

    if validate
      
      if params[:filtering] == "true"
        reports = Report.all.order(report_date: :desc).search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate],params[:cost_center_id], params[:customer_id], params[:date_desde], params[:date_hasta]).paginate(page: params[:page], :per_page => 10)
        reports_total = Report.search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate],params[:cost_center_id], params[:customer_id], params[:date_desde], params[:date_hasta]).order(report_date: :desc)

      elsif params[:filtering] == "false"
        reports = Report.all.order(report_date: :desc).paginate(:page => params[:page], :per_page => 10)
        reports_total =  Report.all.order(report_date: :desc)
      else
        
        reports = Report.all.order(report_date: :desc).paginate(:page => params[:page], :per_page => 10)
        reports_total =  Report.all.order(report_date: :desc)
      end

    else
      
      if params[:filtering] == "true"
        reports = Report.where(report_execute_id: current_user.id).search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate],params[:cost_center_id], params[:customer_id], params[:date_desde], params[:date_hasta]).paginate(page: params[:page], :per_page => 10)
        reports_total = Report.where(report_execute_id: current_user.id).search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate],params[:cost_center_id], params[:customer_id], params[:date_desde], params[:date_hasta])

      elsif params[:filtering] == "false"
        reports = Report.where(report_execute_id: current_user.id).paginate(:page => params[:page], :per_page => 10)
        reports_total =  Report.where(report_execute_id: current_user.id)
      else
        
        reports = Report.where(report_execute_id: current_user.id).paginate(:page => params[:page], :per_page => 10)
        reports_total =  Report.where(report_execute_id: current_user.id)
      end

    end
    

    render :json => {reports_paginate: get_reports_items(reports), reports_total: reports_total}
  end

  def controlmatica
    
  end




  def get_informes

    if  !params[:customer_id].blank? || !params[:execution_state].blank? || !params[:invoiced_state].blank? || !params[:cost_center_id].blank? || !params[:service_type].blank? || !params[:date_desde].blank? || !params[:date_hasta].blank? 
      
      puts params[:customer_id]
      puts params[:execution_state]
      puts params[:invoiced_state]
      puts params[:cost_center_id]
      puts params[:service_type]
      puts params[:date_desde]
      puts params[:centro_incluido]
      puts params[:cliente_incluido]
      
      cost_center = CostCenter.all.searchInfo(params[:customer_id], params[:execution_state], params[:invoiced_state], params[:cost_center_id], params[:service_type], params[:date_desde], params[:date_hasta],params[:cliente_incluido], params[:centro_incluido])

      puts "entre aqui"
      puts cost_center.count
      materials = Material.joins(:cost_center).where('cost_centers.id' => cost_center.ids)
      contractors = Contractor.joins(:cost_center).where('cost_centers.id' => cost_center.ids)
      reports = Report.joins(:cost_center).where('cost_centers.id' => cost_center.ids)
      facturas = CustomerInvoice.joins(:cost_center).where('cost_centers.id' => cost_center.ids)
    else
      cost_center = CostCenter.all
      materials = Material.all
      contractors = Contractor.all
      reports = Report.all
      facturas = CustomerInvoice.all
    end



    months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'jun', 'jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    #COST CENTER POR MES
    months_lleno =[] 
    months.each_with_index do |month,index|
      total = cost_center.where("EXTRACT(MONTH FROM start_date) = ?", index + 1).where("EXTRACT(YEAR FROM start_date) = ?", Date.today.year).sum(:quotation_value)
      puts "jadlñfñdfkasdfl"
      puts month
      
      months_lleno << total.to_f
    end

  #MATERIALES POR MES
    months_lleno_mat =[] 
    months.each_with_index do |month,index|
    total = materials.where("EXTRACT(MONTH FROM sales_date) = ?", index + 1).where("EXTRACT(YEAR FROM sales_date) = ?", Date.today.year).sum(:amount)
    months_lleno_mat << total.to_f
    end
    puts "hola como estoyaaa"
    puts months_lleno_mat
    puts "hola como estoyaaa"

   #TABLERISTAS POR MES
    months_lleno_cont =[] 
    months.each_with_index do |month,index|
      total = contractors.where("EXTRACT(MONTH FROM sales_date) = ?", index + 1).where("EXTRACT(YEAR FROM sales_date) = ?", Date.today.year).sum(:ammount)
      months_lleno_cont << total.to_f
    end


  #REPORTE POR MES
    months_lleno_rep =[] 
    months.each_with_index do |month,index|
      total = reports.where("EXTRACT(MONTH FROM report_date) = ?", index + 1).where("EXTRACT(YEAR FROM report_date) = ?", Date.today.year)
      total = total.sum(:viatic_value) + total.sum(:working_value) + total.sum(:value_displacement_hours)  
      puts total
      puts "ingflskñflñsdlassñlñlj"
      months_lleno_rep << total.to_f
    end

  #VALORES POR AÑO
    cont_total = contractors.where("EXTRACT(YEAR FROM sales_date) = ?", Date.today.year).sum(:ammount)
    mat_total = materials.where("EXTRACT(YEAR FROM sales_date) = ?", Date.today.year).sum(:amount)
    rep_total = reports.where("EXTRACT(YEAR FROM report_date) = ?", Date.today.year)
    report_total = rep_total.sum(:viatic_value) + rep_total.sum(:working_value) + rep_total.sum(:value_displacement_hours)  

    totals_all = [['x', 'datos'],['Ingenieria', report_total.round(0)],['Tablerista', cont_total.round(0)],['Equipos', mat_total.round(0)]]
    

    facturas_total = facturas.where("EXTRACT(YEAR FROM invoice_date) = ?", Date.today.year).sum(:invoice_value)
    gastos_totales = cont_total + mat_total + report_total
    ventas_totales = cost_center.where("EXTRACT(YEAR FROM start_date) = ?", Date.today.year).sum(:quotation_value)

    factura_gastos = [['','x',{ role: "annotation", type: "string" }, 'datos',{ role: "annotation", type: "string" }],["FACTURACION VS GASTOS", facturas_total,number_to_currency(facturas_total,precision: 0), gastos_totales, number_to_currency(gastos_totales, precision: 0)]]

    factura_venta = [['','x',{ role: "annotation", type: "string" }, 'datos',{ role: "annotation", type: "string" }],["FACTURACION VS VENTAS" , facturas_total,number_to_currency(facturas_total,precision: 0), ventas_totales,number_to_currency(ventas_totales,precision: 0)]]

    venta_gastos = [['','x',{ role: "annotation", type: "string" }, 'datos',{ role: "annotation", type: "string" }],["VENTAS VS GASTOS" , ventas_totales,number_to_currency(ventas_totales,precision: 0), gastos_totales,number_to_currency(gastos_totales,precision: 0)]]


    #ENTRADAS POR CENTRO DE COSTOS
    cost_center_entradas = cost_center.where("EXTRACT(YEAR FROM start_date) = ?", Date.today.year)
    ingenieria_entradas = cost_center_entradas.sum(:engineering_value) + cost_center_entradas.sum(:viatic_value) + cost_center_entradas.sum(:offset_value)
    contratista_entradas = cost_center_entradas.sum(:work_force_contractor)
    materials_entradas = cost_center_entradas.sum(:materials_value)



    totals_all_entradas = [['x', 'datos'],['Ingenieria', ingenieria_entradas.round(0)],['Tablerista', contratista_entradas.round(0)],['Equipos', materials_entradas.round(0)]]


    ingenieria_comparativa = [['','Cotizado',{ role: "annotation", type: "string" }, 'Gasto', { role: "annotation", type: "string" }],["", ingenieria_entradas.round(0), number_to_currency(ingenieria_entradas,precision: 0), report_total.round(0), number_to_currency(report_total,precision: 0)]]

    contratista_comparativa = [['','Cotizado',{ role: "annotation", type: "string" }, 'Gasto',{ role: "annotation", type: "string" }],["" , contratista_entradas.round(0), number_to_currency(contratista_entradas,precision: 0), cont_total.round(0),number_to_currency(cont_total,precision: 0)]]

    materiales_comparativa = [['','Cotizado',{ role: "annotation", type: "string" }, 'Gasto',{ role: "annotation", type: "string" }],["" , materials_entradas.round(0), number_to_currency(materials_entradas,precision: 0), mat_total.round(0), number_to_currency(mat_total,precision: 0)]]


    render :json => {
      dataCostCenter: months_lleno,
      dataMaterials: months_lleno_mat,
      dataTableristas: months_lleno_cont,
      dataReports: months_lleno_rep,
      gastosTotales: totals_all,
      facturaGastos: factura_gastos,
      facturaVentas: factura_venta,
      ventaGastos:  venta_gastos,
      entradasTotales: totals_all_entradas,
      ingenieriaComparativa: ingenieria_comparativa,
      contratistaComparativa: contratista_comparativa,
      materialesComparativa: materiales_comparativa




    }
  end
  


  def download_file
    report = ModuleControl.find_by_name("Reportes de servicios")
    estado = current_user.rol.accion_modules.where(module_control_id: report.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)

    if validate
      if params[:ids] != "todos"
        id =  params[:ids].split(",")
        report_show = Report.where(id: id)
      else
        report_show = Report.all
      end

    else

      if params[:ids] != "todos"
        id =  params[:ids].split(",")
        report_show = Report.where(id: id, user_id: current_user.id)
      else
        report_show = Report.where(user_id: current_user.id)
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

        report_show.each.with_index(1) do |task, i|
      
          position = sheet.row(i)
          
          sheet.row(1).default_format = rows_format    
          position[0] = task.code_report
          position[1] = task.cost_center.present? ? task.cost_center.code : ""
          position[2] = task.report_date
          position[3] = task.report_execute.present? ? task.report_execute.names : ""
          position[4] = task.working_time
          position[5] = task.work_description
          position[6] = task.viatic_value
          position[7] = task.viatic_description
          position[8] = task.total_value
          position[9] = task.report_sate ? "Aprobado" : "Sin Aprobar"
          
          
          
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
        position[1] = "Centro de Costos"
        position[2] = "Fecha de Ejecucion"
        position[3] = "Responsable Ejecucion"
        position[4] = "Horas Laboradas"
        position[5] = "Descripcion del Trabajo"
        position[6] = "Valor de los Viaticos"
        position[7] = "Descripcion de Viaticos"
        position[8] = "Valor del Reporte"
        position[9] = "Estado"
        
        
        
        
        sheet.row(0).height = 20
        sheet.column(0).width = 40
        
        
        
        sheet.column(1).width = 40
        
        sheet.column(2).width = 40
        
        sheet.column(3).width = 40
        
        sheet.column(4).width = 40
        
        sheet.column(5).width = 40
        
        sheet.column(6).width = 40
        
        sheet.column(7).width = 40
        
        sheet.column(8).width = 40
        
        sheet.column(9).width = 40
        
        sheet.column(10).width = 40
        
        sheet.row(0).each.with_index { |c, i| sheet.row(0).set_format(i, head_format) }
        
        
        
        temp_file = StringIO.new
        
        task.write(temp_file)
        
        send_data(temp_file.string, :filename => "Reportes_de_servicios.xls", :disposition => 'inline')
        
        end  
    end

  end
    
  

  # GET /reports/1/edit
  def edit
    @centro = CostCenter.where(customer_id: @report.customer.id)
    @contacts_user = @report.customer.contacts
  end

  # POST /reports
  # POST /reports.json

  def create
    valor1 = report_params_create["viatic_value"].gsub('$','').gsub(',','')
    params["viatic_value"] = valor1
    
    @report = Report.create(report_params_create)

      if @report.save
        recalculate_cost_center(@report.cost_center_id, "reportes")

        render :json => {
          message: "¡El Registro fue creado con exito!",
          register: get_report_item(@report),
          type: "success"
        }
      else
        render :json => {
          message: "¡El Registro no fue creado!",
          type: "error",
          message_error: @report.errors.full_messages
        }
      end
  	
  end


  # PATCH/PUT /reports/1
  # PATCH/PUT /reports/1.json

  def update
    if report_params_update["viatic_value"].class.to_s != "Integer" 
      valor1 = report_params_update["viatic_value"].gsub('$','').gsub(',','')
      params["viatic_value"] = valor1
    end

    
    if @report.update(report_params_update.merge!(update_user: current_user.id)) 
      recalculate_cost_center(@report.cost_center_id, "reportes");
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        register: get_report_item(@report),
        type: "success"
      }
    else 
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @parameterization.errors.full_messages
      }
    end
  end


  # DELETE /reports/1
  # DELETE /reports/1.json
  def destroy
    if @report.destroy
      render :json => @report
    else 
      render :json => @report.errors.full_messages
    end
  end
  
 
 def get_contact
  contact = Contact.find(params[:id])
  render json: contact
 end

   
  private
    # Use callbacks to share common setup or constraints between actions.
    def set_report
      @report = Report.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def report_params_create
      defaults = { user_id: current_user.id}
      params.permit(:report_date, :user_id, :working_time, :work_description, :viatic_value, :viatic_description, :total_value, :cost_center_id, :report_code, :report_execute_id, :working_value, :contact_id ,:customer_name, :contact_name, :contact_email, :contact_phone, :contact_position,:customer_id, :count, :displacement_hours, :value_displacement_hours, :update_user).reverse_merge(defaults)
    end
  
    def report_params_update
      params.permit(:report_date, :working_time, :work_description, :viatic_value, :viatic_description, :total_value, :cost_center_id, :report_code, :report_execute_id, :working_value, :contact_id ,:customer_name, :contact_name, :contact_email, :contact_phone, :contact_position,:customer_id, :count, :displacement_hours, :value_displacement_hours, :update_user)
    end
  
end

#  displacement_hours       :float
#  value_displacement_hours :float

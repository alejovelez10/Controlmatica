class ReportsController < ApplicationController
  before_action :set_report, only: [:show, :edit, :update, :destroy]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token
  include ApplicationHelper

  # GET /reports
  # GET /reports.json
  def index
    reports = ModuleControl.find_by_name("Reportes de servicios")
    create = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Eliminar").exists?
    responsible = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Ver Responsables").exists?
    download_file = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Descargar excel").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      responsible: (current_user.rol.name == "Administrador" ? true : responsible),
      download_file: (current_user.rol.name == "Administrador" ? true : download_file)
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
        reports = Report.all.search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate],params[:cost_center_id], params[:customer_id], params[:date_desde], params[:date_hasta]).paginate(page: params[:page], :per_page => 10).to_json( :include => { :cost_center=> { :include => :customer , :only =>[:code, :description]}, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :report_execute => { :only =>[:names] } })
        reports_total = Report.search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate],params[:cost_center_id], params[:customer_id], params[:date_desde], params[:date_hasta])

      elsif params[:filtering] == "false"
        reports = Report.all.paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center=> { :include => :customer , :only =>[:code, :description]}, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :report_execute => { :only =>[:names] } })
        reports_total =  Report.all
      else
        
        reports = Report.all.paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center=> { :include => :customer , :only =>[:code, :description]}, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :report_execute => { :only =>[:names] } })
        reports_total =  Report.all
      end

    else
      
      if params[:filtering] == "true"
        reports = Report.where(report_execute_id: current_user.id).search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate],params[:cost_center_id], params[:customer_id], params[:date_desde], params[:date_hasta]).paginate(page: params[:page], :per_page => 10).to_json( :include => { :cost_center=> { :include => :customer , :only =>[:code, :description]}, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :report_execute => { :only =>[:names] } })
        reports_total = Report.where(report_execute_id: current_user.id).search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate],params[:cost_center_id], params[:customer_id], params[:date_desde], params[:date_hasta])

      elsif params[:filtering] == "false"
        reports = Report.where(report_execute_id: current_user.id).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center=> { :include => :customer , :only =>[:code, :description]}, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :report_execute => { :only =>[:names] } })
        reports_total =  Report.where(report_execute_id: current_user.id)
      else
        
        reports = Report.where(report_execute_id: current_user.id).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center=> { :include => :customer , :only =>[:code, :description]}, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :report_execute => { :only =>[:names] } })
        reports_total =  Report.where(report_execute_id: current_user.id)
      end

    end
    


    reports = JSON.parse(reports)
    render :json => {reports_paginate: reports, reports_total: reports_total}
  end

  def controlmatica
    
  end

  def get_informes
    if params[:descripcion] || params[:customer_id] || params[:execution_state] || params[:invoiced_state] || params[:cost_center_id] || params[:service_type] || params[:date_desde] || params[:date_hasta] || params[:quotation_number]
      cost_center = CostCenter.all.search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state], params[:cost_center_id], params[:service_type], params[:date_desde], params[:date_hasta], params[:quotation_number])
    else
      cost_center = CostCenter.all
    end

    materials = Material.all
    contractors = Contractor.all
    reports = Report.all



    months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'jun', 'jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    months_lleno =[] 
    months.each_with_index do |month,index|
      total = cost_center.where("EXTRACT(MONTH FROM start_date) = ?", index).sum(:quotation_value)
      months_lleno << total.to_f
    end

    months_lleno_mat =[] 
    months.each_with_index do |month,index|
      total = materials.where("EXTRACT(MONTH FROM sales_date) = ?", index).sum(:amount)
      months_lleno_mat << total.to_f
    end
    puts "hola como estoyaaa"
    puts months_lleno_mat
    puts "hola como estoyaaa"

    months_lleno_cont =[] 
    months.each_with_index do |month,index|
      total = contractors.where("EXTRACT(MONTH FROM sales_date) = ?", index).sum(:ammount)
      months_lleno_cont << total.to_f
    end



    months_lleno_rep =[] 
    reports.each_with_index do |month,index|
      total = reports.where("EXTRACT(MONTH FROM report_date) = ?", index)
      total = total.sum(:viatic_value) + total.sum(:working_value) + total.sum(:value_displacement_hours)  
      months_lleno_rep << total.to_f
    end


    cont_total = contractors.where("EXTRACT(YEAR FROM sales_date) = ?", Date.today.year).sum(:ammount)
    mat_total = materials.where("EXTRACT(YEAR FROM sales_date) = ?", Date.today.year).sum(:amount)
    rep_total = reports.where("EXTRACT(YEAR FROM report_date) = ?", Date.today.year)
    report_total = rep_total.sum(:viatic_value) + rep_total.sum(:working_value) + rep_total.sum(:value_displacement_hours)  

    totals_all = [['x', 'datos'],['Ingenieria', cont_total],['Tablerista', mat_total],['Equipos', report_total]]

    

    render :json => {
      dataCostCenter: months_lleno,
      dataMaterials: months_lleno_mat,
      dataTableristas: months_lleno_cont,
      dataReports: months_lleno_rep,
      gastosTotales: totals_all,


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
    valor1 = report_params["viatic_value"].gsub('$','').gsub(',','')
    params["viatic_value"] = valor1
    
    @report = Report.create(report_params)

      if @report.save
        recalculate_cost_center(@report.cost_center_id, "reportes")

        render :json => {
          message: "¡El Registro fue creado con exito!",
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
    if report_params["viatic_value"].class.to_s != "Integer" 
      valor1 = report_params["viatic_value"].gsub('$','').gsub(',','')
      params["viatic_value"] = valor1
    end

    
    if @report.update(report_params.merge!(update_user: current_user.id)) 
      recalculate_cost_center(@report.cost_center_id, "reportes")
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
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
    def report_params
      params.permit(:report_date, :user_id, :working_time, :work_description, :viatic_value, :viatic_description, :total_value, :cost_center_id, :report_code, :report_execute_id, :working_value, :contact_id ,:customer_name, :contact_name, :contact_email, :contact_phone, :contact_position,:customer_id, :count, :displacement_hours, :value_displacement_hours, :update_user)
    end
end

#  displacement_hours       :float
#  value_displacement_hours :float

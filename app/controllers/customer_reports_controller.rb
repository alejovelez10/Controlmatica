class CustomerReportsController < ApplicationController
  before_action :set_customer_report, only: [:show, :edit, :update, :destroy, :pdf_customer_report]
  before_action :authenticate_user!, except: [:aprobar_informe, :aproacion_cliente]
  skip_before_action :verify_authenticity_token
  # GET /customer_reports
  # GET /customer_reports.json
  def index
    customer_reports = ModuleControl.find_by_name("Reportes de clientes")

    create = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Eliminar").exists?
    generate_pdf = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Generar pdf").exists?
    send_email = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Enviar para aprobaciòn").exists?
    edit_email = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Editar email").exists?
    download_file = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Descargar excel").exists?
    edit_all = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Editar todos").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      edit_all: (current_user.rol.name == "Administrador" ? true : edit_all),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      generate_pdf: (current_user.rol.name == "Administrador" ? true : generate_pdf),
      send_email: (current_user.rol.name == "Administrador" ? true : send_email),
      edit_email: (current_user.rol.name == "Administrador" ? true : edit_email),
      download_file: (current_user.rol.name == "Administrador" ? true : download_file)
    }
  end

  def get_customer_reports
    customer_reports_find = ModuleControl.find_by_name("Reportes de clientes")
    estado = current_user.rol.accion_modules.where(module_control_id: customer_reports_find.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)
    
    if validate
      if params[:cost_center_id] || params[:customer_id] || params[:state]
        customer_reports = CustomerReport.order(created_at: :desc).all.paginate(:page => params[:page], :per_page => 10).search(params[:cost_center_id], params[:customer_id], params[:state]).to_json( :include => { :cost_center => { :only =>[:code] }, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :reports => { :only =>[:code_report, :id] }, :last_user_edited => { :only =>[:names, :id] } })
      else
        customer_reports = CustomerReport.order(created_at: :desc).all.paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :reports => { :only =>[:code_report, :id] }, :last_user_edited => { :only =>[:names, :id] } })
      end
    else 
      customer_reports = CustomerReport.where(user_id: current_user.id).order(created_at: :desc).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :reports => { :only =>[:code_report, :id] }, :last_user_edited => { :only =>[:names, :id] } })
    end
  
    customer_reports = JSON.parse(customer_reports)
    render :json => customer_reports
  end

  def get_customer_reports
    customer_reports_find = ModuleControl.find_by_name("Reportes de clientes")
    estado = current_user.rol.accion_modules.where(module_control_id: customer_reports_find.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)

    if validate

      if params[:cost_center_id] || params[:customer_id] || params[:state]
        customer_reports = CustomerReport.all.order(created_at: :desc).search(params[:cost_center_id], params[:customer_id], params[:state], params[:date_desde], params[:date_hasta]).to_json( :include => { :cost_center => { :only =>[:code] }, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :reports => { :only =>[:code_report, :id] }, :last_user_edited => { :only =>[:names, :id] }, :user => { :only =>[:names, :id] } })
        customer_reports_total = CustomerReport.all.order(created_at: :desc).search(params[:cost_center_id], params[:customer_id], params[:state], params[:date_desde], params[:date_hasta]).count

      elsif params[:filter]
        customer_reports = CustomerReport.all.order(created_at: :desc).paginate(page: params[:page], :per_page => params[:filter]).to_json( :include => { :cost_center => { :only =>[:code] }, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :reports => { :only =>[:code_report, :id] }, :last_user_edited => { :only =>[:names, :id] }, :user => { :only =>[:names, :id] } })
        customer_reports_total = CustomerReport.order(created_at: :desc).all.count

      else
        customer_reports = CustomerReport.all.order(created_at: :desc).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :reports => { :only =>[:code_report, :id] }, :last_user_edited => { :only =>[:names, :id] }, :user => { :only =>[:names, :id] } })
        customer_reports_total =  CustomerReport.all.count
      end

    else

      if params[:cost_center_id] || params[:customer_id] || params[:state]
        customer_reports = CustomerReport.where(user_id: current_user.id).order(created_at: :asc).paginate(:page => params[:page], :per_page => 10).search(params[:cost_center_id], params[:customer_id], params[:state], params[:date_desde], params[:date_hasta]).to_json( :include => { :cost_center => { :only =>[:code] }, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :reports => { :only =>[:code_report, :id] }, :last_user_edited => { :only =>[:names, :id] }, :user => { :only =>[:names, :id] } })
        customer_reports_total = CustomerReport.where(user_id: current_user.id).search(params[:cost_center_id], params[:customer_id], params[:state], params[:date_desde], params[:date_hasta]).count

      elsif params[:filter]
        customer_reports = CustomerReport.where(user_id: current_user.id).order(created_at: :asc).paginate(page: params[:page], :per_page => params[:filter]).to_json( :include => { :cost_center => { :only =>[:code] }, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :reports => { :only =>[:code_report, :id] }, :last_user_edited => { :only =>[:names, :id] }, :user => { :only =>[:names, :id] } })
        customer_reports_total = CustomerReport.where(user_id: current_user.id).count

      else
        customer_reports = CustomerReport.where(user_id: current_user.id).order(created_at: :asc).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :reports => { :only =>[:code_report, :id] }, :last_user_edited => { :only =>[:names, :id] }, :user => { :only =>[:names, :id] } })
        customer_reports_total =  CustomerReport.where(user_id: current_user.id).count
      end

    end
    


    customer_reports = JSON.parse(customer_reports)
    render :json => {customer_reports_paginate: customer_reports, customer_reports_total: customer_reports_total}
  end

  # GET /customer_reports/1
  # GET /customer_reports/1.json
  def show
  end

  def pdf_customer_report
    respond_to do |format|
      format.html
      format.pdf do
        render :pdf => "formatos1",
               :template => "customer_reports/pdfs/format_customer.pdf.erb",
               :layout => "pdf.html.erb",
               :show_as_html => params[:debug].present?
      end
    end
  end

  def download_file
    customer_reports_find = ModuleControl.find_by_name("Reportes de clientes")
    estado = current_user.rol.accion_modules.where(module_control_id: customer_reports_find.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)

    if validate
      customer_reports = CustomerReport.all
    else
      customer_reports = CustomerReport.where(user_id: current_user.id)
    end 

    respond_to do |format|

      format.xls do
      
        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet
        
        rows_format = Spreadsheet::Format.new color: :black,
        weight: :normal,
        size: 13,
        align: :left

        customer_reports.each.with_index(1) do |task, i|
      
          position = sheet.row(i)
          
          sheet.row(1).default_format = rows_format    
          position[0] = task.report_date
          position[1] = task.report_code
          position[2] = task.description
          position[3] = ""
          position[4] = task.report_state
          position[5] = task.approve_date
          position[6] = task.customer.present? ? task.customer.name : ""
          
          
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
        
        position[0] = "Creado"
        position[1] = "Codigo"
        position[2] = "Descripcion"
        position[3] = "Enviar para aprobaciòn"
        position[4] = "Estado"
        position[5] = "Fecha Aprobacion"
        position[6] = "Cliente"
        
        
        
        
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
        
        send_data(temp_file.string, :filename => "Reportes_de_clientes.xls", :disposition => 'inline')
        
        end  
    end

  end

  # GET /customer_reports/new
  def new
    @customer_report = CustomerReport.new
  end

  # GET /customer_reports/1/edit
  def edit
    @centro = CostCenter.where(customer_id: @customer_report.customer.id)
    @contacts_user = @customer_report.customer.contacts
    #@reportes = @customer_repore.Report.
  end

  # POST /customer_reports
  # POST /customer_reports.json
  def create
    @customer_report = CustomerReport.create(customer_report_params_create)

    if @customer_report.save
      render :json => {
        message: "¡El Registro fue creado con exito!",
        type: "success"
      }
    else



      render :json => {
        message: "¡El Registro no fue creado!",
        type: "error",
        message_error: @customer_report.errors.full_messages
      }

      puts "no guardaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      puts @customer_report.errors.full_messages
    end
  end

  # PATCH/PUT /customer_reports/1
  # PATCH/PUT /customer_reports/1.json
  def update
    if @customer_report.update(customer_report_params_update.merge!(update_user: current_user.id)) 
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        type: "success"
      }
    else 
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @customer_report.errors.full_messages
      }

    end

  end

  # DELETE /customer_reports/1
  # DELETE /customer_reports/1.json
  def destroy
    if @customer_report.destroy
      render :json => @customer_report
    else 
      render :json => @customer_report.errors.full_messages
    end
  end

  #Metodos Creados

  def aprobar_informe
    @customer_report = CustomerReport.where(token: params[:token]).first
    @customer_report.update(report_state: "Aprobado", approve_date: Date.today)
    CustormerReportMailer.approval_customer_email(@customer_report).deliver
    @customer_report.reports.each do |report|
      report.report_sate = true
      report.save
    end
    redirect_to aproacion_cliente_path(@customer_report.id, @customer_report.token)
  end

  def aproacion_cliente
    @customer_report = params[:report]
    @token = params[:token]
    render :layout => "application"
  end

  def enviar_aprobacion
    @customer_report = CustomerReport.find(params[:report])
    
    actualizo = @customer_report.update(report_state: "Enviado al Cliente")

    if actualizo
      render :json => {
        message: "¡El reporte fue enviado exitosamente!",
        type: "success"
      }
    end
    
  
    CustormerReportMailer.approval_email(@customer_report).deliver
  end


  def get_report_value
    cost_center = CostCenter.find(params[:id])
    render :json => cost_center.reports
  end
  

  private

  #mostrar los que tenga como responsable esa persona en reportes de cliente

  # Use callbacks to share common setup or constraints between actions.
  def set_customer_report
    @customer_report = CustomerReport.find(params[:id])
  end

  # Never trust parameters from the scary internet, only allow the white list through.

  def customer_report_params_create
    defaults = { user_id: current_user.id}
    params.permit(:report_date, :description, :token, :report_state, :report_code, :count, :customer_id, :contact_id, :user_id, :cost_center_id, :email, :update_user, :report_ids => []).reverse_merge(defaults)
  end

  def customer_report_params_update
    params.permit(:report_date, :description, :token, :report_state, :report_code, :count, :customer_id, :contact_id, :user_id, :cost_center_id, :email, :update_user, :report_ids => [])
  end
end

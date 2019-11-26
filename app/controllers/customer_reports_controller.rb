class CustomerReportsController < ApplicationController
  before_action :set_customer_report, only: [:show, :edit, :update, :destroy, :pdf_customer_report]
  before_action :authenticate_user!, except: [:aprobar_informe, :aproacion_cliente]
  skip_before_action :verify_authenticity_token
  # GET /customer_reports
  # GET /customer_reports.json
  def index
    if current_user.rol_user == "Super administrador" || current_user.rol_user == "Comercial"
      if params[:search1] || params[:search2]
        @customer_reports = CustomerReport.all.paginate(:page => params[:page], :per_page => 10).search(params[:search1], params[:search2])
      else
        @customer_reports = CustomerReport.all.paginate(:page => params[:page], :per_page => 10)
      end
    elsif current_user.rol_user == "Ingeniero"
      if params[:search1] || params[:search2]
        @customer_reports = CustomerReport.where(user_id: current_user.id).paginate(:page => params[:page], :per_page => 10).search(params[:search1], params[:search2])
      else
        @customer_reports = CustomerReport.where(user_id: current_user.id).paginate(:page => params[:page], :per_page => 10)
      end
    end

    customer_reports = ModuleControl.find_by_name("Reportes de clientes")

    create = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Eliminar").exists?
    generate_pdf = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Generar pdf").exists?
    send_email = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Enviar para aprobaciòn").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      generate_pdf: (current_user.rol.name == "Administrador" ? true : generate_pdf),
      send_email: (current_user.rol.name == "Administrador" ? true : send_email) 
    }
  end

  def get_customer_reports
    customer_reports = ModuleControl.find_by_name("Reportes de clientes")
    estado = current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)
    
    if validate
      if params[:search1] || params[:search2]
        customer_reports = CustomerReport.all.paginate(:page => params[:page], :per_page => 10).search(params[:search1], params[:search2]).to_json(:include => [:customer])
      else
        customer_reports = CustomerReport.all.paginate(:page => params[:page], :per_page => 10).to_json(:include => [:customer])
      end
    end
  
    customer_reports = JSON.parse(customer_reports)
    render :json => customer_reports
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
    @customer_report = CustomerReport.create(customer_report_params)

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
    end
  end

  # PATCH/PUT /customer_reports/1
  # PATCH/PUT /customer_reports/1.json
  def update
    if @customer_report.update(customer_report_params) 
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

  private

  # Use callbacks to share common setup or constraints between actions.
  def set_customer_report
    @customer_report = CustomerReport.find(params[:id])
  end

  # Never trust parameters from the scary internet, only allow the white list through.
  def customer_report_params
    params.permit(:report_date, :description, :token, :report_state, :report_code, :count, :customer_id, :contact_id, :user_id, :cost_center_id, :report_ids => [])
  end
end

class CustomerReportsController < ApplicationController
  before_action :set_customer_report, only: [:show, :edit, :update, :destroy, :pdf_customer_report]
  before_action :authenticate_user!, except: [:aprobar_informe, :aproacion_cliente]
  skip_before_action :verify_authenticity_token
  # GET /customer_reports
  # GET /customer_reports.json
  def index
    customer_reports = ModuleControl.find_by_name("Reportes de clientes")
    is_admin = current_user.rol.name == "Administrador"

    # Una sola query para obtener todos los permisos
    permisos = current_user.rol.accion_modules
      .where(module_control_id: customer_reports.id)
      .pluck(:name)

    @estados = {
      create: is_admin || permisos.include?("Crear"),
      edit: is_admin || permisos.include?("Editar"),
      edit_all: is_admin || permisos.include?("Editar todos"),
      delete: is_admin || permisos.include?("Eliminar"),
      generate_pdf: is_admin || permisos.include?("Generar pdf"),
      send_email: is_admin || permisos.include?("Enviar para aprobaciòn"),
      edit_email: is_admin || permisos.include?("Editar email"),
      download_file: is_admin || permisos.include?("Descargar excel")
    }
  end

  SORTABLE_COLUMNS = %w[report_date report_code description report_state approve_date created_at].freeze

  def get_customer_reports
    customer_reports_find = ModuleControl.find_by_name("Reportes de clientes")
    estado = current_user.rol.accion_modules.where(module_control_id: customer_reports_find.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)

    reports = validate ? CustomerReport.all : CustomerReport.where(user_id: current_user.id)
    reports = reports.includes(:cost_center, :customer, :contact, :user, :last_user_edited, :reports)

    # Search
    if params[:search].present?
      term = "%#{params[:search].downcase}%"
      reports = reports.left_joins(:customer, :cost_center).where(
        "LOWER(customer_reports.description) LIKE ? OR LOWER(customer_reports.report_code) LIKE ? OR LOWER(customers.name) LIKE ? OR LOWER(cost_centers.code) LIKE ?",
        term, term, term, term
      )
    end

    # Advanced filters
    reports = reports.where(cost_center_id: params[:cost_center_id]) if params[:cost_center_id].present?
    reports = reports.where(customer_id: params[:customer_id]) if params[:customer_id].present?
    reports = reports.where(report_state: params[:state]) if params[:state].present?
    reports = reports.where("customer_reports.report_date >= ?", params[:date_desde]) if params[:date_desde].present?
    reports = reports.where("customer_reports.report_date <= ?", params[:date_hasta]) if params[:date_hasta].present?

    # Sort
    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      reports = reports.order(params[:sort] => direction)
    else
      reports = reports.order(created_at: :desc)
    end

    # Pagination
    page = (params[:page] || 1).to_i
    per_page = [(params[:per_page] || 10).to_i, 100].min
    total = reports.except(:includes).count
    paginated = reports.offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: paginated.map { |cr| serialize_customer_report(cr) },
      meta: { total: total, page: page, per_page: per_page, total_pages: (total.to_f / per_page).ceil }
    }
  end

  private

  def serialize_customer_report(cr)
    {
      id: cr.id,
      report_date: cr.report_date,
      report_code: cr.report_code,
      description: cr.description,
      report_state: cr.report_state,
      approve_date: cr.approve_date,
      email: cr.email,
      token: cr.token,
      customer_id: cr.customer_id,
      cost_center_id: cr.cost_center_id,
      contact_id: cr.contact_id,
      user_id: cr.user_id,
      created_at: cr.created_at,
      updated_at: cr.updated_at,
      cost_center: cr.cost_center.present? ? { code: cr.cost_center.code, id: cr.cost_center.id } : nil,
      customer: cr.customer.present? ? { name: cr.customer.name, id: cr.customer.id } : nil,
      contact: cr.contact.present? ? { name: cr.contact.name, id: cr.contact.id } : nil,
      user: cr.user.present? ? { names: cr.user.names, id: cr.user.id } : nil,
      last_user_edited: cr.last_user_edited.present? ? { names: cr.last_user_edited.names, id: cr.last_user_edited.id } : nil,
      reports: cr.reports.map { |r| { id: r.id, code_report: r.code_report } }
    }
  end

  public

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

    customer_reports = validate ? CustomerReport.all : CustomerReport.where(user_id: current_user.id)
    customer_reports = customer_reports.includes(:customer)

    # Search
    if params[:search].present?
      term = "%#{params[:search].downcase}%"
      customer_reports = customer_reports.left_joins(:customer, :cost_center).where(
        "LOWER(customer_reports.description) LIKE ? OR LOWER(customer_reports.report_code) LIKE ? OR LOWER(customers.name) LIKE ? OR LOWER(cost_centers.code) LIKE ?",
        term, term, term, term
      )
    end

    # Filters
    customer_reports = customer_reports.where(cost_center_id: params[:cost_center_id]) if params[:cost_center_id].present?
    customer_reports = customer_reports.where(customer_id: params[:customer_id]) if params[:customer_id].present?
    customer_reports = customer_reports.where(report_state: params[:state]) if params[:state].present?
    customer_reports = customer_reports.where("customer_reports.report_date >= ?", params[:date_desde]) if params[:date_desde].present?
    customer_reports = customer_reports.where("customer_reports.report_date <= ?", params[:date_hasta]) if params[:date_hasta].present?

    customer_reports = customer_reports.order(created_at: :desc)

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
    params.permit(:report_date, :description, :token, :report_state, :report_code, :count, :customer_id, :contact_id, :cost_center_id, :email, :update_user, :report_ids => [])
  end
end

class ReportsController < ApplicationController
  before_action :set_report, only: [:show, :edit, :update, :destroy]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

  # GET /reports
  # GET /reports.json
  def index
    if current_user.rol_user == "Super administrador" || current_user.rol_user == "Comercial"
      if params[:search1] || params[:search2] || params[:search3] || params[:search4]
        @reports = Report.all.search(params[:search1],params[:search2],params[:search3],params[:search4]).paginate(:page => params[:page], :per_page => 10)
      else 
        @reports = Report.all.paginate(:page => params[:page], :per_page => 10)
      end
    elsif current_user.rol_user == "Ingeniero"
      if params[:search1] || params[:search2] || params[:search3] || params[:search4]
        @reports = Report.where(report_execute_id: current_user.id).search(params[:search1],params[:search2],params[:search3],params[:search4]).paginate(:page => params[:page], :per_page => 10)
      else 
        @reports = Report.where(report_execute_id: current_user.id).paginate(:page => params[:page], :per_page => 10)
      end
    end

    reports = ModuleControl.find_by_name("Reportes de clientes")

    create = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Eliminar").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
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
      if params[:work_description] || params[:report_execute_id] || params[:date_ejecution] || params[:report_sate]
        reports = Report.all.search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate]).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :report_execute => { :only =>[:names] } })
      else
        reports = Report.all.paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :report_execute => { :only =>[:names] } })
      end
    else 
      reports = Report.where(user_id: current_user.id).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :report_execute => { :only =>[:names] } })
    end
    

=begin
    if current_user.rol_user == "Super administrador" || current_user.rol_user == "Comercial"
      if params[:work_description] || params[:report_execute_id] || params[:date_ejecution] || params[:report_sate]
        reports = Report.all.search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate]).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :report_execute => { :only =>[:names] } })
      else 
        reports = Report.all.paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :report_execute => { :only =>[:names] } })
        #.to_json( :include => [:cost_center] )
      end
    elsif current_user.rol_user == "Ingeniero"
      if params[:work_description] || params[:report_execute_id] || params[:date_ejecution] || params[:report_sate]
        reports = Report.where(report_execute_id: current_user.id).search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate]).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :report_execute => { :only =>[:names] } })
      else 
        reports = Report.where(report_execute_id: current_user.id).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :report_execute => { :only =>[:names] } })
      end
    end
=end
    reports = JSON.parse(reports)
    render :json => reports
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
    
    if @report.update(report_params) 
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
      params.permit(:report_date, :user_id, :working_time, :work_description, :viatic_value, :viatic_description, :total_value, :cost_center_id, :report_code, :report_execute_id, :working_value, :contact_id ,:customer_name, :contact_name, :contact_email, :contact_phone, :contact_position,:customer_id)
    end
end

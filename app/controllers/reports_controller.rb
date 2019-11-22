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
    if current_user.rol_user == "Super administrador" || current_user.rol_user == "Comercial"
      if params[:work_description] || params[:report_execute_id] || params[:date_ejecution] || params[:report_sate]
        reports = Report.all.search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate]).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :report_execute => { :only =>[:name] } })
      else 
        reports = Report.all.paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :report_execute => { :only =>[:name] } })
        #.to_json( :include => [:cost_center] )
      end
    elsif current_user.rol_user == "Ingeniero"
      if params[:work_description] || params[:report_execute_id] || params[:date_ejecution] || params[:report_sate]
        reports = Report.where(report_execute_id: current_user.id).search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate]).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :report_execute => { :only =>[:name] } })
      else 
        reports = Report.where(report_execute_id: current_user.id).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :report_execute => { :only =>[:name] } })
      end
    end

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
    valor1 = report_params["viatic_value"].gsub('$','').gsub(',','')
    params["viatic_value"] = valor1
    
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
    @report.destroy
    respond_to do |format|
      format.html { redirect_to reports_url, notice: 'Report was successfully destroyed.' }
      format.json { head :no_content }
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
      params.require(:report).permit(:report_date, :user_id, :working_time, :work_description, :viatic_value, :viatic_description, :total_value, :cost_center_id, :report_code, :report_execute_id, :working_value, :contact_id ,:customer_name, :contact_name, :contact_email, :contact_phone, :contact_position,:customer_id)
    end
end

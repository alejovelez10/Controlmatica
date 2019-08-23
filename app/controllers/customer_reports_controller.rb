class CustomerReportsController < ApplicationController
  before_action :set_customer_report, only: [:show, :edit, :update, :destroy, :pdf_customer_report]
  before_action :authenticate_user!, except: [:aprobar_informe, :aproacion_cliente]
  # GET /customer_reports
  # GET /customer_reports.json
  def index
    if current_user.rol_user == "Super administrador" || current_user.rol_user == "Comercial"
      if params[:search1] || params[:search2]
        @customer_reports = CustomerReport.all.paginate(:page => params[:page], :per_page => 10).search(params[:search1],params[:search2])
      else
        @customer_reports = CustomerReport.all.paginate(:page => params[:page], :per_page => 10)
      end
    elsif current_user.rol_user == "Ingeniero"
      if params[:search1] || params[:search2]
        @customer_reports = CustomerReport.where(user_id: current_user.id).paginate(:page => params[:page], :per_page => 10).search(params[:search1],params[:search2])
      else
        @customer_reports = CustomerReport.where(user_id: current_user.id).paginate(:page => params[:page], :per_page => 10)
      end
    end
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
          :template => 'customer_reports/pdfs/format_customer.pdf.erb',
          :layout => 'pdf.html.erb',
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
    @customer_report = CustomerReport.new(customer_report_params)

    respond_to do |format|
      if @customer_report.save
        format.html { redirect_to @customer_report, notice: 'Customer report was successfully created.' }
        format.json { render :show, status: :created, location: @customer_report }
      else
        format.html { render :new }
        format.json { render json: @customer_report.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /customer_reports/1
  # PATCH/PUT /customer_reports/1.json
  def update
    respond_to do |format|
      if @customer_report.update(customer_report_params)
        format.html { redirect_to @customer_report, notice: 'Customer report was successfully updated.' }
        format.json { render :show, status: :ok, location: @customer_report }
      else
        format.html { render :edit }
        format.json { render json: @customer_report.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /customer_reports/1
  # DELETE /customer_reports/1.json
  def destroy
    @customer_report.destroy
    respond_to do |format|
      
      format.html { 
      
         redirect_to customer_reports_url, notice: 'Customer report was successfully destroyed.' 

      }
      
      format.json { 
      
        head :no_content 

      }
    end
  end

  #Metodos Creados

  def aprobar_informe

    @customer_report = CustomerReport.where(token: params[:token]).first
    @customer_report.update(report_state: "Aprobado",approve_date: Date.today)
    @customer_report.reports.each do |report|

      report.report_sate = true
      report.save

    end  
    redirect_to aproacion_cliente_path(@customer_report.id, @customer_report.token)
    
  end
  

  def aproacion_cliente
      
      @customer_report = params[:report]
      @token = params[:token]
      render  :layout => 'application'

  end


  def enviar_aprobacion
  
       @customer_report = CustomerReport.find(params[:report])
       CustormerReportMailer.approval_email(@customer_report).deliver

  end




  

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_customer_report
      @customer_report = CustomerReport.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def customer_report_params
      params.require(:customer_report).permit(:report_date, :description, :token, :report_state, :report_code, :count, :customer_id, :contact_id,:user_id ,:cost_center_id, :report_ids => [])
    end
end

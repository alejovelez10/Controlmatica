class CustomerReportsController < ApplicationController
  before_action :set_customer_report, only: [:show, :edit, :update, :destroy, :pdf_customer_report]

  # GET /customer_reports
  # GET /customer_reports.json
  def index
    @customer_reports = CustomerReport.all.paginate(:page => params[:page], :per_page => 10)
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
      format.html { redirect_to customer_reports_url, notice: 'Customer report was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_customer_report
      @customer_report = CustomerReport.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def customer_report_params
      params.require(:customer_report).permit(:report_date, :description, :token, :report_state, :report_code, :customer_id, :report_ids => [])
    end
end

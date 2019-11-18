class CostCentersController < ApplicationController
  before_action :set_cost_center, only: [:show, :edit, :update, :destroy, :cost_center_customer, :get_show_center]
  before_action :set_sales_order, only: [:show]
  before_action :authenticate_user!

  # GET /cost_centers
  # GET /cost_centers.json
  def index
    if params[:search1] || params[:search2] || params[:search3] || params[:search4]
      @cost_centers = CostCenter.all.search(params[:search1],params[:search2],params[:search3],params[:search4]).paginate(:page => params[:page], :per_page => 10)
    else
      @cost_centers = CostCenter.all.paginate(:page => params[:page], :per_page => 10)
    end
  end

  def get_cost_centers
    if params[:descripcion] || params[:customer_id] || params[:execution_state] || params[:invoiced_state]
      @cost_centers = CostCenter.all.paginate(page: params[:page], :per_page => 30).search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state])
      @cost_centers_total = CostCenter.all.search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state]).count

    elsif params[:filter]
      @cost_centers = CostCenter.all.paginate(page: params[:page], :per_page => params[:filter])
      @cost_centers_total = CostCenter.all.count
      

    else

      @cost_centers = CostCenter.all.paginate(page: params[:page], :per_page => 30).order(id: :desc)
      @cost_centers_total = CostCenter.all.count
    end

    #ing_cotizado = cost_center.engineering_value
    #ing_real = cost_center.reports.sum(:working_value)
    #via_cotizado = cost_center.viatic_value
    #via_real = cost_center.reports.sum(:viatic_value)
  

    @cost_centers =  @cost_centers.to_json( :include => [:customer] )
    @cost_centers = JSON.parse(@cost_centers)
    render :json => {cost_centers_paginate: @cost_centers, cost_centers_total: @cost_centers_total }
  end
  

  # GET /cost_centers/1
  # GET /cost_centers/1.json
  def show
    #@sales_order = SalesOrder.where(cost_center_id: @cost_centers.id)
    @customer_invoice = CustomerInvoice.where(cost_center_id: @cost_center.id)
  end

  def customer_cost_center
    respond_to do |format|
      format.js
    end

    customer = Customer.find(params[:id])
    @centro = CostCenter.where(customer_id: customer.id)
    @report = Report.where(customer_id: customer.id)
  end

  def get_show_center

    ing_cotizado = @cost_center.engineering_value

    ing_real = @cost_center.reports.sum(:working_value)
    via_cotizado = @cost_center.viatic_value
    via_real = @cost_center.reports.sum(:viatic_value)

    horas_eje = @cost_center.reports.sum(:working_time)

    facturacion = @cost_center.customer_invoices.sum(:invoice_value)

    porc_eje =  @cost_center.eng_hours > 0 ? ((horas_eje.to_f/@cost_center.eng_hours)*100).to_i : "N/A"

    costo_real_en_dinero = @cost_center.hour_real * horas_eje
    costo_en_dinero = @cost_center.hour_real * @cost_center.eng_hours

    porc_eje_costo =  costo_en_dinero > 0 ? (((costo_real_en_dinero.to_f/costo_en_dinero)*100)).to_i : "N/A"

    porc_via =  via_cotizado > 0 ? ((via_real.to_f/via_cotizado)*100).to_i : "N/A" 

    porc_fac =  @cost_center.quotation_value > 0 ? ((facturacion.to_f/@cost_center.quotation_value)*100).to_i : "N/A" 

    total_eje = @cost_center.hour_real * horas_eje

    total_cot= @cost_center.hour_cotizada * horas_eje

    total_margen = total_cot - total_eje 

    porc_ejec =  total_cot > 0 ? ((total_margen.to_f/total_cot)*100).to_i : "N/A" 

    cost_center = @cost_center.to_json( :include => { :customer => { :only =>[:name] }, :contact => { :only =>[:name] } })

    cost_center = JSON.parse(cost_center)
    
    render :json => {
      data_show: cost_center,
      data_orders: @cost_center.sales_orders,

      horas_eje: horas_eje,
      porc_eje: porc_eje,
      
      via_cotizado: via_cotizado,
      via_real: via_real,
      porc_via: porc_via,

      costo_en_dinero: costo_en_dinero,
      costo_real_en_dinero: costo_real_en_dinero,
      porc_eje_costo: porc_eje_costo,

      facturacion: facturacion,
      porc_fac: porc_fac
    }
    
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
    @cost_center = CostCenter.new(cost_center_params)
   
    respond_to do |format|
      if @cost_center.save
        format.html { redirect_to @cost_center, notice: 'Cost center was successfully created.' }
        format.json { render :show, status: :created, location: @cost_center }
      else
        format.html { render :new }
        format.json { render json: @cost_center.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /cost_centers/1
  # PATCH/PUT /cost_centers/1.json
  def update
    respond_to do |format|
      if @cost_center.update(cost_center_params)
        format.html { redirect_to @cost_center, notice: 'Cost center was successfully updated.' }
        format.json { render :show, status: :ok, location: @cost_center }
      else
        format.html { render :edit }
        format.json { render json: @cost_center.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /cost_centers/1
  # DELETE /cost_centers/1.json
  def destroy
    @cost_center.destroy
    respond_to do |format|
      format.html { redirect_to cost_centers_url, notice: 'Cost center was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  def change_state_ended
    @cost_center = CostCenter.find(params[:id])
    state = @cost_center.invoiced_state == "LEGALIZADO" ? "POR FACTURAR" : @cost_center.invoiced_state
    @fac = @cost_center.invoiced_state == "LEGALIZADO" ? true : false
    @cost_center.update(execution_state: "FINALIZADO", invoiced_state: state)

    respond_to do |format|
      format.js
    end
    
  end
  private
    # Use callbacks to share common setup or constraints between actions.
    def set_cost_center
      @cost_center = CostCenter.find(params[:id])
    end

    def set_sales_order
       
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def cost_center_params
      params.require(:cost_center).permit(:customer_id, :contact_id, :description, :start_date, :end_date, :quotation_number, :engineering_value, :viatic_value, :execution_state, :invoiced_state, :service_type, :code, :count, :eng_hours,:hour_cotizada, :hour_real, :quotation_value)
    end
end

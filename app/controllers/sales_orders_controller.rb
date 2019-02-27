class SalesOrdersController < ApplicationController
  before_action :set_sales_order, only: [:show, :edit, :update, :destroy]

  # GET /sales_orders
  # GET /sales_orders.json
  def index
    @sales_orders = SalesOrder.all
  end

  # GET /sales_orders/1
  # GET /sales_orders/1.json
  def show
  end

  # GET /sales_orders/new
  def new
    @cost_center = CostCenter.find(params[:cost_center_id])
    @sales_order = SalesOrder.new
  end

  # GET /sales_orders/1/edit
  def edit
  end

  # POST /sales_orders
  # POST /sales_orders.json
  def create
    @sales_order = SalesOrder.new(sales_order_params)

    respond_to do |format|
      if @sales_order.save
        format.html { redirect_to cost_center_path(@sales_order.cost_center_id), notice: 'Sales order was successfully created.' }
        format.json { render :show, status: :created, location: @sales_order }
      else
        format.html { render :new }
        format.json { render json: @sales_order.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /sales_orders/1
  # PATCH/PUT /sales_orders/1.json
  def update
    respond_to do |format|
      if @sales_order.update(sales_order_params)
        format.html { redirect_to cost_center_path(@sales_order.cost_center_id), notice: 'Sales order was successfully updated.' }
        format.json { render :show, status: :ok, location: @sales_order }
      else
        format.html { render :edit }
        format.json { render json: @sales_order.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /sales_orders/1
  # DELETE /sales_orders/1.json
  def destroy
    cost_center_id = @sales_order.cost_center_id
    @sales_order.destroy
    respond_to do |format|
      format.html { redirect_to cost_center_path(cost_center_id), notice: 'Sales order was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_sales_order
      @sales_order = SalesOrder.find(params[:id])
    end

    def set_cost_center
      @cost_center = CostCenter.find(params[:cost_center])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def sales_order_params
      params.require(:sales_order).permit(:created_date, :order_number, :order_value, :state, :order_file, :cost_center_id)
    end
end

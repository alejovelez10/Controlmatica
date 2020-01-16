class SalesOrdersController < ApplicationController
  before_action :set_sales_order, only: [:show, :edit, :update, :destroy]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token, :only => [:create, :destroy, :update]
  # GET /sales_orders
  # GET /sales_orders.json
  def index
    @estados = {
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
    }
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
     @cost_center = CostCenter.find(@sales_order.cost_center_id)
  end

  # POST /sales_orders
  # POST /sales_orders.json
  def create
    valor1 = sales_order_params["order_value"].gsub('$','').gsub(',','')

    params["order_value"] = valor1

    @sales_order = SalesOrder.create(sales_order_params)

    if @sales_order.save
      render :json => {
        message: "¡El Registro fue creado con exito!",
        type: "success"
      }
    else
      render :json => {
        message: "¡El Registro no fue creado!",
        type: "error",
        message_error: @sales_order.errors.full_messages
      }
    end

  end

  def get_sales_order
    if params[:date_desde] || params[:date_hasta] || params[:number_order] || params[:cost_center_id] 
      sales_order = SalesOrder.all.paginate(page: params[:page], :per_page => 10).search(params[:date_desde], params[:date_hasta], params[:number_order], params[:cost_center_id]).to_json( :include => { :cost_center => { :only =>[:code] } })
      sales_orders_total = SalesOrder.all.search(params[:date_desde], params[:date_hasta], params[:number_order], params[:cost_center_id]).count

    elsif params[:filter]
      sales_order = SalesOrder.all.paginate(page: params[:page], :per_page => params[:filter]).to_json( :include => { :cost_center => { :only =>[:code] } })
      sales_orders_total = SalesOrder.all.count

    else
      sales_order = SalesOrder.all.paginate(page: params[:page], :per_page => 10).order(id: :desc).to_json( :include => { :cost_center => { :only =>[:code] } })
      sales_orders_total = SalesOrder.all.count
    end
    
    sales_order = JSON.parse(sales_order)
    render :json => {sales_order: sales_order, sales_orders_total: sales_orders_total}
  end
  

  # PATCH/PUT /sales_orders/1
  # PATCH/PUT /sales_orders/1.json
  def update

    if params["order_value"].present?
      if sales_order_params["order_value"].class.to_s != "Integer"
        valor1 = sales_order_params["order_value"].gsub('$','').gsub(',','')
        params["order_value"] = valor1
      end
    end

    if @sales_order.update(sales_order_params) 
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        type: "success"
      }
    else 
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @sales_order.errors.full_messages
      }
    end
  end

  # DELETE /sales_orders/1
  # DELETE /sales_orders/1.json
  def destroy
    if @sales_order.destroy
      render :json => @sales_order
    else 
      render :json => @sales_order.errors.full_messages
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
      params.permit(:created_date, :order_number, :order_value, :state, :order_file, :cost_center_id, :user_id)
    end
end

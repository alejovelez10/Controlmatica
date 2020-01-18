class SalesOrdersController < ApplicationController
  before_action :set_sales_order, only: [:show, :edit, :update, :destroy]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token, :only => [:create, :destroy, :update]
  # GET /sales_orders
  # GET /sales_orders.json
  def index
    @estados = {
      create: (current_user.rol.name == "Administrador" ? true : true),
      edit: (current_user.rol.name == "Administrador" ? true : true),
      delete: (current_user.rol.name == "Administrador" ? true : true),
    }
  end

  def get_sales_order_invoice
    sales_orders = SalesOrder.find(params[:id])
    render :json => {
      sales_orders: sales_orders.customer_invoices
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

  def download_file
    respond_to do |format|

      format.xls do
      
        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet
        
        rows_format = Spreadsheet::Format.new color: :black,
        weight: :normal,
        size: 13,
        align: :left

        SalesOrder.all.each.with_index(1) do |task, i|
      
          position = sheet.row(i)
          
          sheet.row(1).default_format = rows_format    
          position[0] = task.cost_center.code
          position[1] = task.created_date
          position[2] = task.order_number
          position[3] = task.order_value
          position[4] = task.description
          position[5] = task.customer_invoices.sum(:invoice_value)
          
          
          
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
        
        position[0] = "Centro de costo"
        position[1] = "Fecha de Generacion"
        position[2] = "Numero"
        position[3] = "Valor"
        position[4] = "Descripcion"
        position[5] = "Total de facturas"

        
        
        
        
        
        sheet.row(0).height = 20
        sheet.column(0).width = 40
        
        
        
        sheet.column(1).width = 40
        
        sheet.column(2).width = 40
        
        sheet.column(3).width = 40
        
        sheet.column(4).width = 40
        
        sheet.column(5).width = 40
        
        
        sheet.row(0).each.with_index { |c, i| sheet.row(0).set_format(i, head_format) }
        
        
        
        temp_file = StringIO.new
        
        task.write(temp_file)
        
        send_data(temp_file.string, :filename => "oirdenes_de_compra.xls", :disposition => 'inline')
        
        end  
    end

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
    if params[:date_desde] || params[:date_hasta] || params[:number_order] || params[:cost_center_id] || params[:state] || params[:description]
      sales_order = SalesOrder.all.paginate(page: params[:page], :per_page => 10).search(params[:date_desde], params[:date_hasta], params[:number_order], params[:cost_center_id], params[:state], params[:description]).to_json( :include => { :cost_center => { :only =>[:code] } })
      sales_orders_total = SalesOrder.all.search(params[:date_desde], params[:date_hasta], params[:number_order], params[:cost_center_id], params[:state], params[:description]).count

    elsif params[:filter]
      sales_order = SalesOrder.all.paginate(page: params[:page], :per_page => params[:filter]).to_json( :include => {  :cost_center => { :only =>[:code] }, :customer_invoices => { :only =>[:invoice_value, :invoice_date] } })
      sales_orders_total = SalesOrder.all.count

    else
      sales_order = SalesOrder.all.paginate(page: params[:page], :per_page => 10).order(id: :desc).to_json( :include => {  :cost_center => { :only =>[:code] }, :customer_invoices => { :only =>[:invoice_value, :invoice_date] } })
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
      params.permit(:created_date, :order_number, :order_value, :state, :order_file, :cost_center_id, :user_id, :description)
    end
end

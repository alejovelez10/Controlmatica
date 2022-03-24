class SalesOrdersController < ApplicationController
  before_action :set_sales_order, only: [:show, :edit, :update, :destroy]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token, :only => [:create, :destroy, :update]
  # GET /sales_orders
  # GET /sales_orders.json
  include SalesOrdersHelper

  def index
    ordenes = ModuleControl.find_by_name("Ordenes de Compra")

    create = current_user.rol.accion_modules.where(module_control_id: ordenes.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: ordenes.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: ordenes.id).where(name: "Eliminar").exists?
    download_file = current_user.rol.accion_modules.where(module_control_id: ordenes.id).where(name: "Descargar excel").exists?
    edit_all = current_user.rol.accion_modules.where(module_control_id: ordenes.id).where(name: "Editar todos").exists?


    @estados = {
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      download_file: (current_user.rol.name == "Administrador" ? true : download_file),
      edit_all: (current_user.rol.name == "Administrador" ? true : edit_all),
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
        
        if params[:ids] == "filtro"
          sales_orders = SalesOrder.search(params[:date_desde], params[:date_hasta], params[:number_order], params[:cost_center_id], params[:state], params[:description], params[:customer], params[:number_invoice], params[:quotation_number])
        else
          sales_orders = SalesOrder.all
        end

        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet
        
        rows_format = Spreadsheet::Format.new color: :black,
        weight: :normal,
        size: 13,
        align: :left


        state = false
        i = 1
        sales_orders.order(created_date: :desc).each.with_index(1) do |task, x|
          

          


          facturas_count = 0 
          if task.customer_invoices.count > 0

              task.customer_invoices.order(invoice_date: :desc).each do |invoice|
              puts i
              
              position = sheet.row(i)
              sheet.row(1).default_format = rows_format    
              position[0] = invoice.sales_order.cost_center.code
              position[1] = invoice.sales_order.cost_center.customer.name
              position[2] = invoice.sales_order.order_number 
              position[3] = invoice.sales_order.created_date
              position[4] = facturas_count == 0 ? invoice.sales_order.order_value : 0
              
              position[5] = invoice.sales_order.description
              position[6] = invoice.number_invoice
              position[7] = invoice.invoice_date
              
              position[8] = invoice.invoice_value
              position[9] = facturas_count == 0 ? invoice.sales_order.customer_invoices.sum(:invoice_value) : 0 
              position[10] = invoice.sales_order.cost_center.invoiced_state
              sheet.row(i).height = 25
              sheet.column(i).width = 40
              sheet.row(i).default_format = rows_format
              i = (i + 1)  
              

              facturas_count = 1
            
            end


           
            

          else

            position = sheet.row(i)
            sheet.row(1).default_format = rows_format    
            position[0] = task.cost_center.code
            position[1] = task.cost_center.customer.name
            position[2] = task.order_number 
            position[3] = task.created_date
            position[4] = task.order_value
            position[5] = task.description
            position[6] = ""
            position[7] = ""
            position[8] = ""
            position[9] = task.customer_invoices.sum(:invoice_value)
            position[10] = task.cost_center.invoiced_state
            i = i + 1
          end
          
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
        position[1] = "Cliente"
        position[2] = "Numero de Orden"
        position[3] = "Fecha"
        position[4] = "Valor"
        position[5] = "Descripcion"
        position[6] = "Numero Factura"
        position[7] = "Fecha Factura"
        position[8] = "Valor Factura"
        position[9] = "Total Facturas"
        position[10] = "Estado"

        
      
        
        
        sheet.row(0).height = 20
        sheet.column(0).width = 40
        
        
        
        sheet.column(1).width = 40
        
        sheet.column(2).width = 30
        
        sheet.column(3).width = 30
        
        sheet.column(4).width = 40
        
        sheet.column(5).width = 40

        sheet.column(6).width = 40

        sheet.column(7).width = 30
        sheet.column(8).width = 30
        sheet.column(9).width = 30
        sheet.column(10).width = 40
        
        
        sheet.row(0).each.with_index { |c, i| sheet.row(0).set_format(i, head_format) }
        
        
        
        temp_file = StringIO.new
        
        task.write(temp_file)
        
        send_data(temp_file.string, :filename => "Ordenes_de_compra.xls", :disposition => 'inline')
        
        end  
    end

  end

  

  # POST /sales_orders
  # POST /sales_orders.json
  def create
    valor1 = sales_order_params_create["order_value"].gsub('$','').gsub(',','')

    params["order_value"] = valor1

    sales_order = SalesOrder.create(sales_order_params_create)

    if sales_order.save
      render :json => {
        message: "¡El Registro fue creado con exito!",
        register: get_sales_orders_item(sales_order),
        type: "success"
      }
    else
      render :json => {
        message: "¡El Registro no fue creado!",
        type: "error",
        message_error: sales_order.errors.full_messages
      }
    end

  end

  def get_sales_order
    if params[:filtering] == "true"
      sales_orders = SalesOrder.search(params[:date_desde], params[:date_hasta], params[:number_order], params[:cost_center_id], params[:state], params[:description], params[:customer], params[:number_invoice], params[:quotation_number]).order(created_at: :desc).paginate(page: params[:page], :per_page => 10)
      sales_orders_total = SalesOrder.search(params[:date_desde], params[:date_hasta], params[:number_order], params[:cost_center_id], params[:state], params[:description], params[:customer], params[:number_invoice], params[:quotation_number]).order(created_at: :desc)

    elsif params[:filtering] == "false"
      sales_orders = SalesOrder.all.order(created_at: :desc).paginate(:page => params[:page], :per_page => 10)
      sales_orders_total =  SalesOrder.all
    else
      
      sales_orders = SalesOrder.all.order(created_at: :desc).paginate(page: params[:page], :per_page => 10).order(id: :desc)
      sales_orders_total = SalesOrder.all
    end

    render :json => {sales_order: get_sales_orders_items(sales_orders), sales_orders_total: sales_orders_total}
  end
  

  # PATCH/PUT /sales_orders/1
  # PATCH/PUT /sales_orders/1.json
  def update

    if params["order_value"].present?
      if sales_order_params_update["order_value"].class.to_s != "Integer"
        valor1 = sales_order_params_update["order_value"].gsub('$','').gsub(',','')
        params["order_value"] = valor1
      end
    end

    if @sales_order.update(sales_order_params_update.merge!(update_user: current_user.id)) 
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        register: get_sales_orders_item(@sales_order),
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
    def sales_order_params_create
      defaults = { user_id: current_user.id}
      params.permit(:created_date, :order_number, :order_value, :state, :order_file, :cost_center_id, :user_id, :description, :update_user).reverse_merge(defaults)
    end
  
    def sales_order_params_update
      params.permit(:created_date, :order_number, :order_value, :state, :order_file, :cost_center_id, :description, :update_user)
    end
end

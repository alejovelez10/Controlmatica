class SalesOrdersController < ApplicationController
  before_action :set_sales_order, only: [:show, :edit, :update, :destroy]
  before_action :authenticate_user!

  # GET /sales_orders
  # GET /sales_orders.json
  include SalesOrdersHelper

  SORTABLE_COLUMNS = %w[created_date order_number order_value description].freeze

  def index
    mod = ModuleControl.find_by_name("Ordenes de Compra")
    is_admin = current_user.rol.name == "Administrador"
    permisos = current_user.rol.accion_modules.where(module_control_id: mod.id).pluck(:name)
    @estados = {
      create: is_admin || permisos.include?("Crear"),
      edit: is_admin || permisos.include?("Editar"),
      delete: is_admin || permisos.include?("Eliminar"),
      download_file: is_admin || permisos.include?("Descargar excel"),
      edit_all: is_admin || permisos.include?("Editar todos"),
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
    orders = SalesOrder.all.includes(:customer_invoices, :cost_center => :customer, :user => {}, :last_user_edited => {})

    # Single search bar
    if params[:search].present?
      term = "%#{params[:search].downcase}%"
      orders = orders.joins(cost_center: :customer)
        .where("LOWER(sales_orders.order_number) LIKE ? OR LOWER(sales_orders.description) LIKE ? OR LOWER(customers.name) LIKE ? OR LOWER(cost_centers.code) LIKE ?", term, term, term, term)
    end

    # Advanced filters
    if params[:date_desde].present?
      orders = orders.where("sales_orders.created_date >= ?", params[:date_desde])
    end
    if params[:date_hasta].present?
      orders = orders.where("sales_orders.created_date <= ?", params[:date_hasta])
    end
    if params[:number_order].present?
      orders = orders.where(order_number: params[:number_order])
    end
    if params[:cost_center_id].present?
      orders = orders.where(cost_center_id: params[:cost_center_id])
    end
    if params[:state].present?
      cc_ids = CostCenter.where(invoiced_state: params[:state]).pluck(:id)
      orders = orders.where(cost_center_id: cc_ids)
    end
    if params[:description].present?
      desc_term = "%#{params[:description].downcase}%"
      orders = orders.where("LOWER(sales_orders.description) LIKE ?", desc_term)
    end
    if params[:customer].present?
      cc_ids = CostCenter.where(customer_id: params[:customer]).pluck(:id)
      orders = orders.where(cost_center_id: cc_ids)
    end
    if params[:number_invoice].present?
      so_ids = CustomerInvoice.where(number_invoice: params[:number_invoice]).pluck(:sales_order_id).compact
      orders = orders.where(id: so_ids)
    end
    if params[:quotation_number].present?
      cc_ids = CostCenter.where(quotation_number: params[:quotation_number]).pluck(:id)
      orders = orders.where(cost_center_id: cc_ids)
    end

    # Sort
    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      orders = orders.order(params[:sort] => direction)
    else
      orders = orders.order(created_at: :desc)
    end

    page = (params[:page] || 1).to_i
    per_page = [(params[:per_page] || 50).to_i, 100].min
    total = orders.except(:includes).count
    paginated = orders.offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: get_sales_orders_items(paginated),
      meta: { total: total, page: page, per_page: per_page, total_pages: (total.to_f / per_page).ceil }
    }
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

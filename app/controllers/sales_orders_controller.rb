class SalesOrdersController < ApplicationController
  before_action :set_sales_order, only: [:show, :edit, :update, :destroy]
  before_action :authenticate_user!

  # GET /sales_orders
  # GET /sales_orders.json
  include SalesOrdersHelper
  include ExcelXls

  SORTABLE_COLUMNS = %w[created_date order_number order_value description].freeze

  # Las columnas de la tabla en el mismo orden ("Archivo" sale como Si/No).
  # Una fila por factura de la orden (o una sola si no tiene); el valor de la
  # orden y los totales van solo en la primera, para que sumar en Excel no los
  # duplique.
  ENCABEZADOS_EXCEL = [
    "Centro de costo", "Cliente", "Fecha de orden", "# Orden", "# Cotización", "Valor",
    "Número de factura", "Fecha de factura", "Valor de la factura", "Ingeniería de la factura",
    "Total facturas", "Total ingeniería", "Descripción", "Estado CC", "Tiene archivo",
    "Fecha de creación", "Creado por", "Última actualización", "Actualizado por"
  ].freeze

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

  # La misma consulta que la tabla (get_sales_order), sin paginar: el frontend
  # manda los mismos parametros con que cargo la tabla.
  def download_file
    sales_orders = sorted_sales_orders(filtered_sales_orders(
      SalesOrder.includes(:customer_invoices, :user, :last_user_edited, cost_center: :customer)
    ))

    respond_to do |format|
      format.xls do
        filas = sales_orders.flat_map { |order| filas_excel_orden(order) }
        send_data(xls_libro(ENCABEZADOS_EXCEL, filas, anchos: { "Descripción" => 60 }),
                  :filename => "Ordenes_de_compra.xls", :disposition => 'inline')
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
    orders = sorted_sales_orders(filtered_sales_orders(
      SalesOrder.all.includes(:customer_invoices, :cost_center => :customer, :user => {}, :last_user_edited => {})
    ))

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

    # Los filtros de la tabla. Los comparten la tabla (get_sales_order) y el
    # Excel (download_file) para que el archivo traiga lo mismo que se ve en
    # pantalla. Antes el Excel usaba SalesOrder.search, que reventaba con
    # `downcase` de nil cuando el frontend no mandaba un filtro vacio (3-nov-2026).
    def filtered_sales_orders(orders)
      # Barra de busqueda
      if params[:search].present?
        term = "%#{params[:search].downcase}%"
        orders = orders.joins(cost_center: :customer)
          .where("LOWER(sales_orders.order_number) LIKE ? OR LOWER(sales_orders.description) LIKE ? OR LOWER(customers.name) LIKE ? OR LOWER(cost_centers.code) LIKE ?", term, term, term, term)
      end

      # Filtros avanzados
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

      orders
    end

    def sorted_sales_orders(orders)
      if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
        direction = params[:dir] == "desc" ? :desc : :asc
        orders.order(params[:sort] => direction)
      else
        orders.order(created_at: :desc)
      end
    end

    def filas_excel_orden(order)
      center = order.cost_center
      inicio = [center&.code, center&.customer&.name, order.created_date, order.order_number,
                center&.quotation_number]
      final = [order.description, center&.invoiced_state, order[:order_file].present? ? "Sí" : "No",
               xls_fecha_local(order.created_at), order.user&.names,
               xls_fecha_local(order.updated_at), order.last_user_edited&.names]
      facturas = order.customer_invoices.sort_by { |f| f.invoice_date.to_s }.reverse
      total = facturas.sum { |f| f.invoice_value.to_f }
      total_ingenieria = facturas.sum { |f| f.engineering_value.to_f }

      return [inicio + [order.order_value, "", "", "", "", total, total_ingenieria] + final] if facturas.empty?

      facturas.each_with_index.map do |f, k|
        inicio + [k.zero? ? order.order_value : 0, f.number_invoice, f.invoice_date, f.invoice_value,
                  f.engineering_value, k.zero? ? total : 0, k.zero? ? total_ingenieria : 0] + final
      end
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

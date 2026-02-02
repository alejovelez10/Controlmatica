class CustomersController < ApplicationController
  before_action :set_customer, only: [:show, :edit, :update, :destroy, :customer_user, :get_client, :report_user]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

  def index
    mod = ModuleControl.find_by_name("Clientes")
    is_admin = current_user.rol.name == "Administrador"
    permisos = current_user.rol.accion_modules.where(module_control_id: mod.id).pluck(:name)

    @estados = {
      create: is_admin || permisos.include?("Crear"),
      edit: is_admin || permisos.include?("Editar"),
      delete: is_admin || permisos.include?("Eliminar"),
      download_file: is_admin || permisos.include?("Descargar excel")
    }
  end

  SORTABLE_COLUMNS = %w[name code phone address nit web email].freeze

  def get_customers
    sleep(2) if Rails.env.development?
    customers = Customer.search(params[:name])

    # Ordenamiento server-side
    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      customers = customers.order(params[:sort] => direction)
    else
      customers = customers.ordered
    end

    page = (params[:page] || 1).to_i
    per_page = (params[:per_page] || 10).to_i
    per_page = [per_page, 100].min

    total = customers.count
    paginated = customers.offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: paginated.as_json(only: [:id, :name, :code, :phone, :address, :nit, :web, :email]),
      meta: {
        total: total,
        page: page,
        per_page: per_page,
        total_pages: (total.to_f / per_page).ceil
      }
    }
  end

  def import_customers
    if Customer.import(params[:file], current_user.id)
      render json: {
        success: "Los Archivos fueron importados con exito!",
        type: "success",
      }
    end
  end

  def download_file
    customers = Customer.select(:name, :phone, :address, :nit, :web, :email).ordered
    respond_to do |format|
      format.xls do
        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet

        rows_format = Spreadsheet::Format.new color: :black, weight: :normal, size: 13, align: :left
        head_format = Spreadsheet::Format.new color: :white, weight: :bold, size: 12,
          pattern_bg_color: :xls_color_10, pattern: 2, vertical_align: :middle, align: :left

        headers = ["Nombre", "Telefono", "Dirección", "Nit", "Web", "Email"]
        position = sheet.row(0)
        headers.each_with_index { |h, i| position[i] = h }
        sheet.row(0).height = 20
        headers.length.times { |i| sheet.column(i).width = 40 }
        sheet.row(0).each_with_index { |_, i| sheet.row(0).set_format(i, head_format) }

        customers.each_with_index do |c, i|
          row = sheet.row(i + 1)
          row[0] = c.name
          row[1] = c.phone
          row[2] = c.address
          row[3] = c.nit
          row[4] = c.web
          row[5] = c.email
          sheet.row(i + 1).height = 25
          sheet.row(i + 1).default_format = rows_format
        end

        temp_file = StringIO.new
        task.write(temp_file)
        send_data(temp_file.string, filename: "Clientes.xls", disposition: 'inline')
      end
    end
  end

  def show
    respond_to do |format|
      format.html
      format.json {
        render json: @customer.as_json(
          only: [:id, :name, :code, :phone, :address, :nit, :web, :email],
          include: { contacts: { only: [:id, :name, :phone, :email, :position] } }
        )
      }
    end
  end

  def customer_user
    render json: CostCenter.where(customer_id: @customer.id).filter
  end

  def get_client
    render json: @customer.contacts.where.not(name: "")
  end

  def create_contact
    @create_contact = Contact.create(
      customer_id: params[:customer_id],
      name: params[:contact_name],
      email: params[:contact_email],
      phone: params[:contact_phone],
      position: params[:contact_position],
      user_id: current_user.id
    )

    if @create_contact.persisted?
      render json: { message: "¡El Registro fue creado con exito!", type: "success", register: @create_contact }
    else
      render json: { message: "¡El Registro no fue creado!", type: "error", message_error: @create_contact.errors.full_messages }
    end
  end

  def report_user
    respond_to do |format|
      format.js
    end
    @centro = @customer.contacts
  end

  def new
    @customer = Customer.new
    @customers = Customer.pluck(:code).compact
  end

  def edit
  end

  def create
    @customer = Customer.new(customer_params)
    @customer.user_id = current_user.id

    respond_to do |format|
      if @customer.save
        format.html { redirect_to customers_url, notice: 'Cliente creado exitosamente.' }
        format.json { render json: { success: true, message: "Cliente creado exitosamente" }, status: :created }
      else
        format.html { render :new }
        format.json { render json: { success: false, errors: @customer.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def update
    respond_to do |format|
      if @customer.update(customer_params)
        format.html { redirect_to customers_url, notice: 'Cliente actualizado exitosamente.' }
        format.json { render json: { success: true, message: "Cliente actualizado exitosamente" }, status: :ok }
      else
        format.html { render :edit }
        format.json { render json: { success: false, errors: @customer.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    if @customer.destroy
      render json: @customer
    else
      render json: @customer.errors.full_messages
    end
  end

  private

  def set_customer
    @customer = Customer.find(params[:id])
  end

  def customer_params
    params.require(:customer).permit(:client, :name, :code, :phone, :address, :nit, :web, :email, :user_id,
      contacts_attributes: [:id, :name, :phone, :email, :customer_id, :position, :user_id, :_destroy])
  end
end

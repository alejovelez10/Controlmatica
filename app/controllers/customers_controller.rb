class CustomersController < ApplicationController
  before_action :set_customer, only: [:show, :edit, :update, :destroy, :customer_user, :get_client, :report_user]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

  # GET /customers
  # GET /customers.json
  def index
    customers = ModuleControl.find_by_name("Clientes")

    create = current_user.rol.accion_modules.where(module_control_id: customers.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: customers.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: customers.id).where(name: "Eliminar").exists?
    download_file = current_user.rol.accion_modules.where(module_control_id: customers.id).where(name: "Descargar excel").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      download_file: (current_user.rol.name == "Administrador" ? true : download_file)
    }

    @customers = Customer.all.paginate(:page => params[:page], :per_page => 10).order(created_at: :desc)
  end

  def import_customers
    if Customer.import(params[:file], current_user.id)
      render :json => {
        success: "Los Archivos fueron importados con exito!",
        type: "success",
      }
    end
  end
  

  def download_file
    customers = Customer.all
    respond_to do |format|

      format.xls do
      
        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet
        
        rows_format = Spreadsheet::Format.new color: :black,
        weight: :normal,
        size: 13,
        align: :left

        customers.each.with_index(1) do |task, i|
      
          position = sheet.row(i)
          
          sheet.row(1).default_format = rows_format    
          position[0] = task.name
          position[1] = task.phone
          position[2] = task.address
          position[3] = task.nit
          position[4] = task.web
          position[5] = task.email
          
          
          
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
        
        position[0] = "Nombre"
        position[1] = "Telefono"
        position[2] = "Dirección"
        position[3] = "Nit"
        position[4] = "Web"
        position[5] = "Email"
        
        
        
        
        sheet.row(0).height = 20
        sheet.column(0).width = 40
        
        
        
        sheet.column(1).width = 40
        
        sheet.column(2).width = 40
        
        sheet.column(3).width = 40
        
        sheet.column(4).width = 40
        
        sheet.column(5).width = 40
        
        sheet.column(6).width = 40
        
        sheet.column(7).width = 40
        
        sheet.column(8).width = 40
        
        sheet.column(9).width = 40
        
        sheet.column(10).width = 40
        
        sheet.row(0).each.with_index { |c, i| sheet.row(0).set_format(i, head_format) }
        
        
        
        temp_file = StringIO.new
        
        task.write(temp_file)
        
        send_data(temp_file.string, :filename => "Clientes.xls", :disposition => 'inline')
        
        end  
    end

  end

  def get_customers
    if params[:name].present?
      customers = Customer.search(params[:name])
    else
      customers = Customer.all
    end
    render :json => customers
  end
  

  # GET /customers/1
  # GET /customers/1.json
  def show
  end


  def customer_user
    render :json => @centro = CostCenter.where(customer_id: @customer.id).where("start_date >= ?", Date.new(2025, 1, 1)).filter
  end

  def get_client
    render :json => @contacts_user = @customer.contacts.where.not(name: "")
  end

  def create_contact
    @create_contact = Contact.create(customer_id: params[:customer_id], name: params[:contact_name], email: params[:contact_email], phone: params[:contact_phone], position:  params[:contact_position], user_id: current_user.id)
    
      if @create_contact.save
        render :json => {
          message: "¡El Registro fue creado con exito!",
          type: "success",
          register: @create_contact
        }
      else
        render :json => {
          message: "¡El Registro no fue creado!",
          type: "error",
          message_error: @create_contact.errors.full_messages
        }
      end
  	
  end
  

  def report_user
    respond_to do |format|
      format.js
    end 
    @centro = @customer.contacts  
  end

  # GET /customers/new
  def new
    @customer = Customer.new
    @customers = []
    Customer.all.each do |c|
      @customers << c.code
    end
  end

  # GET /customers/1/edit
  def edit
  end

  # POST /customers
  # POST /customers.json
  def create
    @customer = Customer.new(customer_params)

    respond_to do |format|
      if @customer.save
        format.html { redirect_to customers_url, notice: 'Customer was successfully created.' }
        format.json { render :show, status: :created, location: @customer }
      else
        format.html { render :new }
        format.json { render json: @customer.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /customers/1
  # PATCH/PUT /customers/1.json
  def update
    respond_to do |format|
      if @customer.update(customer_params)
        format.html { redirect_to customers_url, notice: 'Customer was successfully updated.' }
        format.json { render :show, status: :ok, location: @customer }
      else
        format.html { render :edit }
        format.json { render json: @customer.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /customers/1
  # DELETE /customers/1.json
  def destroy
    if @customer.destroy
      render :json => @customer
    else 
      render :json => @customer.errors.full_messages
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_customer
      @customer = Customer.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.

    def create_customer
      params.permit(:client, :name, :code,:phone, :address, :nit, :web, :email, :user_id)
    end

    def customer_params
      params.require(:customer).permit(:client, :name, :code,:phone, :address, :nit, :web, :email, :user_id, contacts_attributes: [:id, :name, :phone, :email, :customer_id, :position, :user_id, :_destroy])
    end
end

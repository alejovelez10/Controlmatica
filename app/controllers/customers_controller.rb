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

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete)
    }

    @customers = Customer.all.paginate(:page => params[:page], :per_page => 10)
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
    render :json => @centro = CostCenter.where(customer_id: @customer.id)
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

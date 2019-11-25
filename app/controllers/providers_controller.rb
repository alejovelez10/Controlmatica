class ProvidersController < ApplicationController
  before_action :set_provider, only: [:show, :edit, :update, :destroy]
    before_action :authenticate_user!
    skip_before_action :verify_authenticity_token
  # GET /providers
  # GET /providers.json
  def index
    providers = ModuleControl.find_by_name("Proveedores")

    create = current_user.rol.accion_modules.where(module_control_id: providers.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: providers.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: providers.id).where(name: "Eliminar").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete)
    }

    @providers = Provider.all.paginate(:page => params[:page], :per_page => 10)
  end

  def get_providers
    if params[:name].present?
      providers = Provider.search(params[:name])
    else
      providers = Provider.all
    end
    render :json => providers
  end
  

  # GET /providers/1
  # GET /providers/1.json
  def show
  end

  # GET /providers/new
  def new
    @provider = Provider.new
  end

  # GET /providers/1/edit
  def edit
  end

  # POST /providers
  # POST /providers.json
  def create
    @provider = Provider.new(provider_params)

    respond_to do |format|
      if @provider.save
        format.html { redirect_to providers_path, notice: 'Provider was successfully created.' }
        format.json { render :show, status: :created, location: @provider }
      else
        format.html { render :new }
        format.json { render json: @provider.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /providers/1
  # PATCH/PUT /providers/1.json
  def update
    respond_to do |format|
      if @provider.update(provider_params)
        format.html { redirect_to providers_path, notice: 'Provider was successfully updated.' }
        format.json { render :show, status: :ok, location: @provider }
      else
        format.html { render :edit }
        format.json { render json: @provider.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /providers/1
  # DELETE /providers/1.json
  def destroy
    if @provider.destroy
      render :json => @provider
    else 
      render :json => @provider.errors.full_messages
    end
  end


  private
    # Use callbacks to share common setup or constraints between actions.
    def set_provider
      @provider = Provider.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def provider_params
      params.require(:provider).permit(:name, :phone, :address, :nit, :web, :email, :user_id, contacts_attributes: [:id, :name, :phone, :email, :provider_id, :position, :user_id, :_destroy])
    end
end

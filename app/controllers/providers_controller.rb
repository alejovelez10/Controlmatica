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
    download_file = current_user.rol.accion_modules.where(module_control_id: providers.id).where(name: "Descargar excel").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      download_file: (current_user.rol.name == "Administrador" ? true : download_file)
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


  def download_file
    providers = Provider.all
    respond_to do |format|

      format.xls do
      
        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet
        
        rows_format = Spreadsheet::Format.new color: :black,
        weight: :normal,
        size: 13,
        align: :left

        providers.each.with_index(1) do |task, i|
      
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
        
        send_data(temp_file.string, :filename => "Proveedores.xls", :disposition => 'inline')
        
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

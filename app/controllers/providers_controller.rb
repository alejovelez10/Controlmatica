class ProvidersController < ApplicationController
  before_action :set_provider, only: [:show, :edit, :update, :destroy]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

  SORTABLE_COLUMNS = %w[name phone address nit web email].freeze

  def index
    mod = ModuleControl.find_by_name("Proveedores")
    is_admin = current_user.rol.name == "Administrador"
    permisos = current_user.rol.accion_modules.where(module_control_id: mod.id).pluck(:name)

    @estados = {
      create: is_admin || permisos.include?("Crear"),
      edit: is_admin || permisos.include?("Editar"),
      delete: is_admin || permisos.include?("Eliminar"),
      download_file: is_admin || permisos.include?("Descargar excel")
    }
  end

  def get_providers
    providers = Provider.search(params[:name])

    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      providers = providers.order(params[:sort] => direction)
    else
      providers = providers.ordered
    end

    page = (params[:page] || 1).to_i
    per_page = [(params[:per_page] || 10).to_i, 100].min
    total = providers.count
    paginated = providers.offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: paginated.as_json(only: [:id, :name, :phone, :address, :nit, :web, :email]),
      meta: {
        total: total,
        page: page,
        per_page: per_page,
        total_pages: (total.to_f / per_page).ceil
      }
    }
  end

  def import_providers
    if Provider.import(params[:file], current_user.id)
      render json: { success: "Los Archivos fueron importados con exito!", type: "success" }
    end
  end

  def show
    respond_to do |format|
      format.html
      format.json {
        render json: @provider.as_json(
          only: [:id, :name, :phone, :address, :nit, :web, :email],
          include: { contacts: { only: [:id, :name, :phone, :email, :position] } }
        )
      }
    end
  end

  def new
    @provider = Provider.new
  end

  def edit
  end

  def create
    @provider = Provider.new(provider_params)
    @provider.user_id = current_user.id

    respond_to do |format|
      if @provider.save
        format.html { redirect_to providers_path, notice: 'Proveedor creado exitosamente.' }
        format.json { render json: { success: true, message: "Proveedor creado exitosamente" }, status: :created }
      else
        format.html { render :new }
        format.json { render json: { success: false, errors: @provider.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def update
    respond_to do |format|
      if @provider.update(provider_params)
        format.html { redirect_to providers_path, notice: 'Proveedor actualizado exitosamente.' }
        format.json { render json: { success: true, message: "Proveedor actualizado exitosamente" }, status: :ok }
      else
        format.html { render :edit }
        format.json { render json: { success: false, errors: @provider.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def download_file
    providers = Provider.select(:name, :phone, :address, :nit, :web, :email).ordered
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

        providers.each_with_index do |p, i|
          row = sheet.row(i + 1)
          row[0] = p.name
          row[1] = p.phone
          row[2] = p.address
          row[3] = p.nit
          row[4] = p.web
          row[5] = p.email
          sheet.row(i + 1).height = 25
          sheet.row(i + 1).default_format = rows_format
        end

        temp_file = StringIO.new
        task.write(temp_file)
        send_data(temp_file.string, filename: "Proveedores.xls", disposition: 'inline')
      end
    end
  end

  def destroy
    if @provider.destroy
      render json: @provider
    else
      render json: @provider.errors.full_messages
    end
  end

  private

  def set_provider
    @provider = Provider.find(params[:id])
  end

  def provider_params
    params.require(:provider).permit(:name, :phone, :address, :nit, :web, :email, :user_id,
      contacts_attributes: [:id, :name, :phone, :email, :provider_id, :position, :user_id, :_destroy])
  end
end

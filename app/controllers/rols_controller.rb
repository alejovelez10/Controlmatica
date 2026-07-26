class RolsController < ApplicationController
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token, only: [:create, :update, :destroy, :get_rols]

  SORTABLE_COLUMNS = %w[name description].freeze

  def index
    mod = ModuleControl.find_by_name("Roles")
    if mod
      perms = current_user.rol.accion_modules.where(module_control_id: mod.id).pluck(:name)
      is_admin = current_user.rol.name == "Administrador"
      @estados = {
        create: is_admin || perms.include?("Crear"),
        edit:   is_admin || perms.include?("Editar"),
        delete: is_admin || perms.include?("Eliminar"),
      }
    else
      @estados = { create: false, edit: false, delete: false }
    end
  end

  def get_rols
    rols = Rol.all

    # Búsqueda
    if params[:name].present?
      rols = rols.where("LOWER(name) LIKE ?", "%#{params[:name].downcase}%")
    end

    # Ordenamiento
    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      rols = rols.order(params[:sort] => direction)
    else
      rols = rols.order(created_at: :desc)
    end

    page = (params[:page] || 1).to_i
    per_page = [(params[:per_page] || 10).to_i, 100].min
    total = rols.count
    paginated = rols.offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: paginated.as_json(
        only: [:id, :name, :description],
        include: { accion_modules: { only: [:id] } }
      ),
      meta: { total: total, page: page, per_page: per_page, total_pages: (total.to_f / per_page).ceil }
    }
  end

  def show
    @rol = Rol.find(params[:id])
    render json: @rol.as_json(
      only: [:id, :name, :description],
      include: { accion_modules: { only: [:id] } }
    )
  end

  def get_modules_with_actions
    modules = ModuleControl.includes(:accion_modules).order(:name)
    render json: modules.as_json(
      only: [:id, :name],
      include: { accion_modules: { only: [:id, :name] } }
    )
  end

  def create
    @rol = Rol.new(module_params)
    if @rol.save
      render json: { success: true, message: "Rol creado exitosamente" }, status: :created
    else
      render json: { success: false, errors: @rol.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    @rol = Rol.find(params[:id])
    if @rol.update(module_params)
      render json: { success: true, message: "Rol actualizado exitosamente" }
    else
      render json: { success: false, errors: @rol.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @rol = Rol.find(params[:id])
    if @rol.destroy
      render json: @rol
    else
      render json: @rol.errors.full_messages, status: :unprocessable_entity
    end
  end

  private

  def module_params
    params.permit(:name, :description, :user_id, accion_module_ids: [])
  end
end

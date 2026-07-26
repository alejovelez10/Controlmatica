class ModuleControlsController < ApplicationController
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token, only: [:create, :update, :destroy, :get_actions, :get_accion_modules]

  SORTABLE_COLUMNS = %w[name description].freeze

  def index
    mod = ModuleControl.find_by_name("Tableristas")
    if mod
      perms = current_user.rol.accion_modules.where(module_control_id: mod.id).pluck(:name)
      is_admin = current_user.rol.name == "Administrador"
      @estados = {
        create:    is_admin || perms.include?("Crear"),
        edit:      is_admin || perms.include?("Editar"),
        delete:    is_admin || perms.include?("Eliminar"),
        gestionar: true,
      }
    else
      @estados = { create: false, edit: false, delete: false, gestionar: false }
    end
  end

  def get_actions
    modules = ModuleControl.all

    if params[:name].present?
      modules = modules.where("LOWER(name) LIKE ?", "%#{params[:name].downcase}%")
    end

    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      modules = modules.order(params[:sort] => direction)
    else
      modules = modules.order(created_at: :desc)
    end

    page = (params[:page] || 1).to_i
    per_page = [(params[:per_page] || 10).to_i, 100].min
    total = modules.count
    paginated = modules.includes(:accion_modules).offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: paginated.as_json(
        only: [:id, :name, :description],
        include: { accion_modules: { only: [:id, :name, :description] } }
      ),
      meta: { total: total, page: page, per_page: per_page, total_pages: (total.to_f / per_page).ceil }
    }
  end

  def show
    @modulo = ModuleControl.find(params[:id])
    render json: @modulo.as_json(
      only: [:id, :name, :description],
      include: { accion_modules: { only: [:id, :name, :description] } }
    )
  end

  def get_accion_modules
    @modulo = ModuleControl.find(params[:id])
    render json: @modulo.accion_modules.order(:name).as_json(only: [:id, :name, :description])
  end

  def create
    @modulo = ModuleControl.new(module_params)
    if @modulo.save
      render json: { success: true, message: "Módulo creado exitosamente" }, status: :created
    else
      render json: { success: false, errors: @modulo.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    @modulo = ModuleControl.find(params[:id])
    if @modulo.update(module_params)
      render json: { success: true, message: "Módulo actualizado exitosamente" }
    else
      render json: { success: false, errors: @modulo.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @modulo = ModuleControl.find(params[:id])
    if @modulo.destroy
      render json: @modulo
    else
      render json: @modulo.errors.full_messages, status: :unprocessable_entity
    end
  end

  private

  def module_params
    params.permit(:name, :description, :user_id)
  end
end

class ParameterizationsController < ApplicationController
  before_action :set_parameterization, only: [:show, :edit, :update, :destroy]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

  SORTABLE_COLUMNS = %w[name money_value].freeze

  def index
    mod = ModuleControl.find_by_name("Parametrizaciones")
    is_admin = current_user.rol.name == "Administrador"
    permisos = current_user.rol.accion_modules.where(module_control_id: mod.id).pluck(:name)

    @estados = {
      create: is_admin || permisos.include?("Crear"),
      edit: is_admin || permisos.include?("Editar"),
      delete: is_admin || permisos.include?("Eliminar")
    }
  end

  def get_parameterizations
    items = Parameterization.search(params[:name])

    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      items = items.order(params[:sort] => direction)
    else
      items = items.ordered
    end

    page = (params[:page] || 1).to_i
    per_page = [(params[:per_page] || 10).to_i, 100].min
    total = items.count
    paginated = items.offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: paginated.as_json(only: [:id, :name, :money_value]),
      meta: { total: total, page: page, per_page: per_page, total_pages: (total.to_f / per_page).ceil }
    }
  end

  def show
    respond_to do |format|
      format.html
      format.json { render json: @parameterization.as_json(only: [:id, :name, :money_value]) }
    end
  end

  def create
    clean_money_value!
    @parameterization = Parameterization.new(parameterization_params)
    @parameterization.user_id = current_user.id

    if @parameterization.save
      render json: { success: true, message: "Parametrización creada exitosamente" }, status: :created
    else
      render json: { success: false, errors: @parameterization.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    clean_money_value!

    if @parameterization.update(parameterization_params)
      render json: { success: true, message: "Parametrización actualizada exitosamente" }, status: :ok
    else
      render json: { success: false, errors: @parameterization.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    if @parameterization.destroy
      render json: @parameterization
    else
      render json: @parameterization.errors.full_messages
    end
  end

  private

  def set_parameterization
    @parameterization = Parameterization.find(params[:id])
  end

  def clean_money_value!
    if params[:parameterization].present? && params[:parameterization][:money_value].present?
      params[:parameterization][:money_value] = params[:parameterization][:money_value].to_s.gsub(/[$,]/, '')
    elsif params[:money_value].present?
      params[:money_value] = params[:money_value].to_s.gsub(/[$,]/, '')
    end
  end

  def parameterization_params
    if params[:parameterization].present?
      params.require(:parameterization).permit(:name, :number_value, :money_value)
    else
      params.permit(:name, :user_id, :number_value, :money_value)
    end
  end
end

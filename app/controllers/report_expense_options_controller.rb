class ReportExpenseOptionsController < ApplicationController
  before_action :authenticate_user!
  before_action :report_expense_option_find, only: [:update, :destroy]

  SORTABLE_COLUMNS = %w[name category].freeze

  def index
    mod = ModuleControl.find_by_name("Tipos de Gastos")
    is_admin = current_user.rol.name == "Administrador"
    permisos = current_user.rol.accion_modules.where(module_control_id: mod.id).pluck(:name)

    @estados = {
      create: is_admin || permisos.include?("Crear"),
      edit: is_admin || permisos.include?("Editar"),
      delete: is_admin || permisos.include?("Eliminar"),
    }
  end

  def get_report_expense_options
    options = ReportExpenseOption.all

    if params[:search].present?
      lower_term = "%#{params[:search].downcase}%"
      options = options.where("LOWER(name) LIKE ? OR LOWER(category) LIKE ?", lower_term, lower_term)
    end

    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      options = options.order(params[:sort] => direction)
    else
      options = options.order(created_at: :desc)
    end

    page = (params[:page] || 1).to_i
    per_page = [(params[:per_page] || 10).to_i, 100].min
    total = options.count
    paginated = options.offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: paginated.as_json(only: [:id, :name, :category]),
      meta: {
        total: total,
        page: page,
        per_page: per_page,
        total_pages: (total.to_f / per_page).ceil
      }
    }
  end

  def create
    report_expense_option = ReportExpenseOption.create(rreport_expense_options_create)
    if report_expense_option.save
      render json: {
        success: "El Registro fue creado con exito!",
        type: "success",
      }
    else
      render json: {
        success: "El Registro No se creo!",
        message: report_expense_option.errors.full_messages,
        type: "error",
      }
    end
  end

  def update
    if @report_expense_option.update(report_expense_options_update)
      render json: {
        success: "El Registro fue actualizado con exito!",
        type: "success",
      }
    else
      render json: {
        success: "El Registro No se actualizo!",
        message: @report_expense_option.errors.full_messages,
        type: "error",
      }
    end
  end

  def destroy
    if @report_expense_option.destroy
      render json: {
        success: "El Registro fue eliminado con exito!",
        type: "success",
      }
    end
  end

  private

    def report_expense_option_find
      @report_expense_option = ReportExpenseOption.find(params[:id])
    end

    def rreport_expense_options_create
      defaults = { user_id: current_user.id }
      params.permit(:user_id, :category, :name).reverse_merge(defaults)
    end

    def report_expense_options_update
      params.permit(:user_id, :category, :name)
    end
end

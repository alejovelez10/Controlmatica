class AccionModulesController < ApplicationController
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token, only: [:create, :update, :destroy, :get_accions]

  def get_accions
    modules = ModuleControl.includes(:accion_modules).order(:name)
    render json: modules.as_json(
      only: [:id, :name],
      include: { accion_modules: { only: [:id, :name] } }
    )
  end

  def create
    @accion_module = AccionModule.new(action_module_params)
    if @accion_module.save
      render json: { success: true, message: "Acción creada exitosamente" }, status: :created
    else
      render json: { success: false, errors: @accion_module.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    @accion_module = AccionModule.find(params[:id])
    if @accion_module.update(action_module_params)
      render json: { success: true, message: "Acción actualizada exitosamente" }
    else
      render json: { success: false, errors: @accion_module.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @accion_module = AccionModule.find(params[:id])
    if @accion_module.destroy
      render json: { success: true }
    else
      render json: { success: false, errors: @accion_module.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def action_module_params
    params.permit(:name, :description, :user_id, :module_control_id)
  end
end

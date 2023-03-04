class ReportExpenseOptionsController < ApplicationController
  before_action :authenticate_user!
  before_action :report_expense_option_find, only: [:update, :destroy]

  def index
      report_expense = ModuleControl.find_by_name("Tipos de Gastos")

      create = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Crear").exists?
      edit = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Editar").exists?
      delete = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Eliminar").exists?
  
      @estados = {      
        create: (current_user.rol.name == "Administrador" ? true : create),
        edit: (current_user.rol.name == "Administrador" ? true : edit),
        delete: (current_user.rol.name == "Administrador" ? true : delete),
      }
  end

  def get_report_expense_options
      report_expense_options = ReportExpenseOption.all.order(created_at: :desc)
      render json: {
        data: ActiveModelSerializers::SerializableResource.new(report_expense_options, each_serializer: ReportExpenseOptionSerializer),
      }   
  end
  
  def create
      report_expense_option = ReportExpenseOption.create(rreport_expense_options_create)
      if report_expense_option.save
          render :json => {
              success: "El Registro fue creado con exito!",
              register: ActiveModelSerializers::SerializableResource.new(report_expense_option, each_serializer: ReportExpenseOptionSerializer),
              type: "success",
          }
      else
          render :json => {
              success: "El Registro No se creo!",
              message: report_expense_option.errors.full_messages,
              type: "error",
          }
      end
  end

  def update
      update_status = @report_expense_option.update(report_expense_options_update)
      if update_status
          render :json => {
              success: "El Registro fue actualizado con exito!",
              register: ActiveModelSerializers::SerializableResource.new(@report_expense, each_serializer: ReportExpenseOptionSerializer),
              type: "success",
          }
      else
          render :json => {
              success: "El Registro No se creo!",
              message: @report_expense.errors.full_messages,
              type: "error",
          }
      end
  end

  def destroy
      if @report_expense_option.destroy
          render :json => {
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
          defaults = { user_id: current_user.id}
          params.permit(:user_id, :category, :name).reverse_merge(defaults)
      end

      def report_expense_options_update
          params.permit(:user_id, :category, :name)
      end
end

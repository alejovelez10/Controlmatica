class ReportExpensesController < ApplicationController
    before_action :authenticate_user!
    before_action :report_expense_find, only: [:update, :destroy]

    def index
        report_expense = ModuleControl.find_by_name("Gastos")

        create = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Crear").exists?
        edit = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Editar").exists?
        delete = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Eliminar").exists?
    
        @estados = {      
          create: (current_user.rol.name == "Administrador" ? true : create),
          edit: (current_user.rol.name == "Administrador" ? true : edit),
          delete: (current_user.rol.name == "Administrador" ? true : delete),
        }
    end

    def indicators_expenses
        @validate = (current_user.rol.name == "Administrador" ? true : false)
    end
    

    def get_report_expenses
        report_expense = ModuleControl.find_by_name("Gastos")
        show_all = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Ver todos").exists?

        if params[:cost_center_id] || params[:user_invoice_id] || params[:invoice_name] || params[:invoice_date] || params[:identification] || params[:description] || params[:invoice_number] || params[:invoice_type] || params[:payment_type] || params[:invoice_value] || params[:invoice_tax] || params[:invoice_total]
            if show_all || current_user.rol.name == "Administrador"
                report_expenses = ReportExpense.search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:invoice_type], params[:payment_type], params[:invoice_value], params[:invoice_tax], params[:invoice_total])
            else
                report_expenses = ReportExpense.where(user_invoice_id: current_user.id).search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:invoice_type], params[:payment_type], params[:invoice_value], params[:invoice_tax], params[:invoice_total])
            end
        else
            if show_all || current_user.rol.name == "Administrador"
                report_expenses = ReportExpense.all
            else
                report_expenses = ReportExpense.where(user_invoice_id: current_user.id)
            end
        end

        render json: {
          data: ActiveModelSerializers::SerializableResource.new(report_expenses, each_serializer: ReportExpenseSerializer),
        }   
    end
    
    def create
        report_expense = ReportExpense.create(report_expense_params_create)
        if report_expense.save
            render :json => {
                success: "El Registro fue creado con exito!",
                register: ActiveModelSerializers::SerializableResource.new(report_expense, each_serializer: ReportExpenseSerializer),
                type: "success",
            }
        else
            render :json => {
                success: "El Registro No se creo!",
                message: report_expense.errors.full_messages,
                type: "error",
            }
        end
    end
  
    def update
        update_status = @report_expense.update(report_expense_params_update)
        if update_status
            render :json => {
                success: "El Registro fue actualizado con exito!",
                register: ActiveModelSerializers::SerializableResource.new(@report_expense, each_serializer: ReportExpenseSerializer),
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
        if @report_expense.destroy
            render :json => {
                success: "El Registro fue eliminado con exito!",
                type: "success",
            }
        end
    end
  
    private
  
        def report_expense_find
            @report_expense = ReportExpense.find(params[:id])
        end
    
        def report_expense_params_create
            defaults = { user_id: current_user.id}
            params.permit(:user_id, :cost_center_id, :user_invoice_id, :invoice_name, :invoice_date, :description, :invoice_number, :invoice_type, :identification, :invoice_value, :invoice_tax, :invoice_total, :type_identification_id, :payment_type_id).reverse_merge(defaults)
        end

        def report_expense_params_update
            params.permit(:user_id, :cost_center_id, :user_invoice_id, :invoice_name, :invoice_date, :description, :invoice_number, :invoice_type, :identification, :invoice_value, :invoice_tax, :invoice_total, :type_identification_id, :payment_type_id)
        end
end

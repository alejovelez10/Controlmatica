class ReportExpensesController < ApplicationController
    before_action :authenticate_user!
    before_action :report_expense_find, only: [:update, :destroy]

    def index
  
    end

    def indicators_expenses
        @validate = (current_user.rol.name == "Administrador" ? true : estado)
    end
    

    def get_report_expenses
        if params[:cost_center_id] || params[:user_invoice_id] || params[:invoice_name] || params[:invoice_date] || params[:type_identification] || params[:description] || params[:invoice_number] || params[:invoice_type] || params[:payment_type] || params[:invoice_value] || params[:invoice_tax] || params[:invoice_total]
            report_expenses = ReportExpense.search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:type_identification], params[:description], params[:invoice_number], params[:invoice_type], params[:payment_type], params[:invoice_value], params[:invoice_tax], params[:invoice_total])
        else
            report_expenses = ReportExpense.all
        end

        render json: {
          data: ActiveModelSerializers::SerializableResource.new(report_expenses, each_serializer: ReportExpenseSerializer),
        }   
    end
    
    def create
        report_expense = ReportExpense.create(report_expense_params)
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
        update_status = @report_expense.update(report_expense_params)
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
    
        def report_expense_params
            defaults = { user_id: current_user.id}
            params.permit(:user_id, :cost_center_id, :user_invoice_id, :invoice_name, :invoice_date, :type_identification, :description, :invoice_number, :invoice_type, :payment_type, :invoice_value, :invoice_tax, :invoice_total).reverse_merge(defaults)
        end
end

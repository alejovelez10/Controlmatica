class ExpenseRatiosController < ApplicationController
    before_action :authenticate_user!
    before_action :expense_ratio_find, only: [:update, :destroy, :pdf]

    def index
  
    end

    def pdf
        @report_expenses = ReportExpense.where(user_invoice_id: @expense_ratio.user_report_id).where("invoice_date >= ?", @expense_ratio.start_date).where("invoice_date <= ?", @expense_ratio.end_date)

        respond_to do |format|
            #format.html
            format.pdf do
                render :pdf => "formatos1",
                    :template => "expense_ratios/pdfs/expense_ratios.pdf.erb",
                    :layout => "pdf.html.erb",
                    :orientation => 'Landscape',
                    :show_as_html => params[:debug].present?
            end
        end
    end

    def get_expense_ratios
        expense_ratios = ExpenseRatio.all
        render json: {
          data: ActiveModelSerializers::SerializableResource.new(expense_ratios, each_serializer: ExpenseRatioSerializer),
        }   
    end
    
    def create
        report_expense = ExpenseRatio.create(expense_ratio_params)
        if report_expense.save
            redirect_to expense_ratio_pdf_path(report_expense.id, :format => 'pdf')
        end
    end
  
    def update
        update_status = @expense_ratio.update(expense_ratio_params)
        if update_status
            render :json => {
                success: "El Registro fue actualizado con exito!",
                register: ActiveModelSerializers::SerializableResource.new(@expense_ratio, each_serializer: ExpenseRatioSerializer),
                type: "success",
            }
        else
            render :json => {
                success: "El Registro No se creo!",
                message: @expense_ratio.errors.full_messages,
                type: "error",
            }
        end
    end
  
    def destroy
        if @expense_ratio.destroy
            render :json => {
                success: "El Registro fue eliminado con exito!",
                type: "success",
            }
        end
    end
  
    private
  
        def expense_ratio_find
            @expense_ratio = ExpenseRatio.find(params[:id])
        end
    
        def expense_ratio_params
            params.permit(:creation_date, :user_report_id, :start_date, :end_date, :area, :observations, :user_direction_id)
        end
end
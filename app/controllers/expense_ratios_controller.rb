class ExpenseRatiosController < ApplicationController
    before_action :authenticate_user!
    before_action :expense_ratio_find, only: [:update, :destroy, :pdf]

    def index
        expense_ratio = ModuleControl.find_by_name("Relación de gastos")

        create = current_user.rol.accion_modules.where(module_control_id: expense_ratio.id).where(name: "Crear").exists?
        edit = current_user.rol.accion_modules.where(module_control_id: expense_ratio.id).where(name: "Editar").exists?
        delete = current_user.rol.accion_modules.where(module_control_id: expense_ratio.id).where(name: "Eliminar").exists?
        pdf = current_user.rol.accion_modules.where(module_control_id: expense_ratio.id).where(name: "Ver pdf").exists?
    
        @estados = {      
          create: (current_user.rol.name == "Administrador" ? true : create),
          edit: (current_user.rol.name == "Administrador" ? true : edit),
          delete: (current_user.rol.name == "Administrador" ? true : delete),
          pdf: (current_user.rol.name == "Administrador" ? true : pdf),
        }
    end

    def pdf
        @report_expenses = ReportExpense.where(user_invoice_id: @expense_ratio.user_report_id).where("invoice_date >= ?", @expense_ratio.start_date).where("invoice_date <= ?", @expense_ratio.end_date)

        respond_to do |format|
            #format.html
            format.pdf do
                render :pdf => "formatos1",
                    :template => "expense_ratios/pdfs/expense_ratios.pdf.erb",
                    :layout => "pdf.html.erb",
                    :orientation => "landscape",
                          :footer => {
                  :spacing => 5,
                  :html => {
                    :template => "expense_ratios/pdfs/footer.pdf.erb",
                  },
                },
                :header => {
                    :spacing => 5,
                    :html => {
                      :template => "expense_ratios/pdfs/header.pdf.erb",
                    },
                  },
                    
                    :show_as_html => params[:debug].present?
            end
        end
    end
    
    def get_documents_create
        if params[:filtering] == "true"
          documents = DocumentManagement::Document.where(tenant_id: current_user.tenant_id, state: "creando").search(params[:name], params[:document_type_id], params[:proceso_id], params[:user_create_id], params[:user_review_id], params[:user_approve_id], params[:due_date], params[:version]).paginate(page: params[:page], :per_page => 10)
          documents_total = DocumentManagement::Document.where(tenant_id: current_user.tenant_id, state: "creando").search(params[:name], params[:document_type_id], params[:proceso_id], params[:user_create_id], params[:user_review_id], params[:user_approve_id], params[:due_date], params[:version]).count
  
        elsif params[:filtering] == "false"
          documents = DocumentManagement::Document.where(tenant_id: current_user.tenant_id, state: "creando").paginate(:page => params[:page], :per_page => 10)
          documents_total =  DocumentManagement::Document.where(tenant_id: current_user.tenant_id, state: "creando").count
  
        else
          documents = DocumentManagement::Document.where(tenant_id: current_user.tenant_id, state: "creando").paginate(:page => params[:page], :per_page => 10)
          documents_total = DocumentManagement::Document.where(tenant_id: current_user.tenant_id, state: "creando").count
  
        end
  
        render json: {
          data: ActiveModelSerializers::SerializableResource.new(documents, each_serializer: DocumentManagement::DocumentSerializer),
          documents_total: documents_total,
        }
      end

    def get_expense_ratios
        expense_ratio = ModuleControl.find_by_name("Relación de gastos")
        show_all = current_user.rol.accion_modules.where(module_control_id: expense_ratio.id).where(name: "Ver todos").exists?
        
        if params[:user_direction_id] || params[:user_report_id] || params[:observations] || params[:start_date] || params[:end_date] || params[:creation_date] || params[:area] 
            if show_all
                expense_ratios = ExpenseRatio.search(params[:user_direction_id], params[:user_report_id], params[:observations], params[:start_date], params[:end_date], params[:creation_date], params[:area]).paginate(page: params[:page], :per_page => 10)
                total = ExpenseRatio.search(params[:user_direction_id], params[:user_report_id], params[:observations], params[:start_date], params[:end_date], params[:creation_date], params[:area]).count
            else
                expense_ratios = ExpenseRatio.where(user_report_id: current_user.id).search(params[:user_direction_id], params[:user_report_id], params[:observations], params[:start_date], params[:end_date], params[:creation_date], params[:area]).paginate(page: params[:page], :per_page => 10)
                total = ExpenseRatio.where(user_report_id: current_user.id).search(params[:user_direction_id], params[:user_report_id], params[:observations], params[:start_date], params[:end_date], params[:creation_date], params[:area]).count
            end
        else
            if show_all
                expense_ratios = ExpenseRatio.all.paginate(page: params[:page], :per_page => 10)
                total = ExpenseRatio.all.count
            else
                expense_ratios = ExpenseRatio.where(user_report_id: current_user.id).paginate(page: params[:page], :per_page => 10)
                total = ExpenseRatio.where(user_report_id: current_user.id).count
            end
        end

        render json: {
          data: ActiveModelSerializers::SerializableResource.new(expense_ratios.order(created_at: :desc), each_serializer: ExpenseRatioSerializer),
          total: total
        }   
    end
    
    def create
        expense_ratio = ExpenseRatio.create(expense_ratio_params)
        if expense_ratio.save
            render :json => {
                success: "El Registro fue creado con exito!",
                register: ActiveModelSerializers::SerializableResource.new(expense_ratio, each_serializer: ExpenseRatioSerializer),
                type: "success",
            }
        else
            render :json => {
                success: "El Registro No se creo!",
                message: expense_ratio.errors.full_messages,
                type: "error",
            }
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
            params.permit(:creation_date, :user_report_id, :start_date, :end_date, :area, :observations, :user_direction_id, :anticipo)
        end
end

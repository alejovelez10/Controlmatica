class ExpenseRatiosController < ApplicationController
    before_action :authenticate_user!
    before_action :expense_ratio_find, only: [:update, :destroy, :pdf]

    def index
        expense_ratio = ModuleControl.find_by_name("Relación de gastos")
        is_admin = current_user.rol.name == "Administrador"

        # Una sola query para obtener todos los permisos
        permission_names = current_user.rol.accion_modules
          .where(module_control_id: expense_ratio.id)
          .pluck(:name)

        @estados = {
          create: is_admin || permission_names.include?("Crear"),
          edit: is_admin || permission_names.include?("Editar"),
          delete: is_admin || permission_names.include?("Eliminar"),
          pdf: is_admin || permission_names.include?("Ver pdf"),
        }
    end

    def pdf
        # Eager loading para evitar N+1 en la vista PDF
        @report_expenses = ReportExpense
          .includes(:cost_center, :user_invoice, :type_identification, :payment_type)
          .where(user_invoice_id: @expense_ratio.user_report_id)
          .where(invoice_date: @expense_ratio.start_date..@expense_ratio.end_date)

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
        show_all = current_user.rol.accion_modules.where(module_control_id: expense_ratio.id, name: "Ver todos").exists?
        validation = current_user.rol.name == "Administrador" || show_all

        # Base query con includes para evitar N+1 (el serializer usa user_report, user_direction, last_user_edited, user)
        base_query = ExpenseRatio.includes(:user_report, :user_direction, :last_user_edited, :user)

        # Filtrar por usuario si no tiene permiso de ver todos
        base_query = base_query.where(user_report_id: current_user.id) unless validation

        # Aplicar filtros de busqueda si hay parametros
        has_filters = params[:user_direction_id].present? || params[:user_report_id].present? ||
                      params[:observations].present? || params[:start_date].present? ||
                      params[:end_date].present? || params[:creation_date].present? || params[:area].present?

        if has_filters
            base_query = base_query.search(
                params[:user_direction_id], params[:user_report_id], params[:observations],
                params[:start_date], params[:end_date], params[:creation_date], params[:area]
            )
        end

        # Obtener total antes de paginar (una sola query con count)
        total = base_query.count

        # Ordenamiento dinámico con validación
        sort_dir = params[:dir] == "asc" ? "ASC" : "DESC"
        direct_columns = %w[area creation_date start_date end_date observations anticipo created_at updated_at]

        if direct_columns.include?(params[:sort])
          sort_order = "expense_ratios.#{params[:sort]} #{sort_dir}"
          expense_ratios = base_query.order(Arel.sql(sort_order)).paginate(page: params[:page], per_page: params[:per_page] || 50)
        elsif params[:sort] == "user_direction_name"
          expense_ratios = base_query.joins("LEFT JOIN users AS directors ON directors.id = expense_ratios.user_direction_id")
                                     .order(Arel.sql("directors.names #{sort_dir}"))
                                     .paginate(page: params[:page], per_page: params[:per_page] || 50)
        elsif params[:sort] == "user_report_name"
          expense_ratios = base_query.joins("LEFT JOIN users AS reporters ON reporters.id = expense_ratios.user_report_id")
                                     .order(Arel.sql("reporters.names #{sort_dir}"))
                                     .paginate(page: params[:page], per_page: params[:per_page] || 50)
        else
          expense_ratios = base_query.order(created_at: :desc).paginate(page: params[:page], per_page: params[:per_page] || 50)
        end

        render json: {
          data: ActiveModelSerializers::SerializableResource.new(expense_ratios, each_serializer: ExpenseRatioSerializer),
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

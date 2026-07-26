class ReportExpensesController < ApplicationController
  before_action :authenticate_user!
  before_action :report_expense_find, only: [:update, :destroy]
  skip_before_action :verify_authenticity_token, only: [:upload_file]
  include ApplicationHelper

  def index
    # Usar helpers memoizados - evita query de ModuleControl y accion_modules (785ms -> ~0ms)
    @estados = {
      create: is_admin? || has_menu_permission?("Gastos", "Crear"),
      edit: is_admin? || has_menu_permission?("Gastos", "Editar"),
      delete: is_admin? || has_menu_permission?("Gastos", "Eliminar"),
      closed: is_admin? || has_menu_permission?("Gastos", "Aceptar gasto"),
      export: is_admin? || has_menu_permission?("Gastos", "Exportar a excel"),
      show_user: is_admin? || has_menu_permission?("Gastos", "Cambiar responsable"),
    }
  end

  def indicators_expenses
    @validate = is_admin?
  end

  def get_report_expenses
    # Usar helper memoizado para evitar queries de permisos (581ms -> ~0ms)
    show_all = is_admin? || has_menu_permission?("Gastos", "Ver todos")

    # Base query con includes para evitar N+1
    base_query = ReportExpense.includes(:cost_center, :user_invoice, :type_identification, :payment_type, :last_user_edited, :user)

    # Filtrar por usuario si no tiene permiso de ver todos
    base_query = base_query.where(user_invoice_id: current_user.id) unless show_all

    # Aplicar filtros de búsqueda si hay parámetros
    has_filters = params[:cost_center_id].present? || params[:user_invoice_id].present? || params[:invoice_name].present? ||
                  params[:invoice_date].present? || params[:identification].present? || params[:description].present? ||
                  params[:invoice_number].present? || params[:type_identification_id].present? || params[:payment_type_id].present? ||
                  params[:invoice_value].present? || params[:invoice_tax].present? || params[:invoice_total].present? ||
                  params[:start_date].present? || params[:end_date].present? || params[:is_acepted].present?

    if has_filters
      base_query = base_query.search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date],
                                      params[:identification], params[:description], params[:invoice_number], params[:type_identification_id],
                                      params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total],
                                      params[:start_date], params[:end_date], params[:is_acepted])
    end

    # Obtener total antes de paginar (una sola query con count)
    total = base_query.count

    # Ordenamiento dinámico con validación
    sort_dir = params[:dir] == "asc" ? "ASC" : "DESC"
    direct_columns = %w[invoice_name invoice_date identification description invoice_number invoice_value invoice_tax invoice_total is_acepted created_at updated_at]

    if direct_columns.include?(params[:sort])
      sort_order = "report_expenses.#{params[:sort]} #{sort_dir}"
      report_expenses = base_query.order(Arel.sql(sort_order)).paginate(page: params[:page], per_page: params[:per_page] || 50)
    elsif params[:sort] == "cost_center_code"
      report_expenses = base_query.joins(:cost_center).order(Arel.sql("cost_centers.code #{sort_dir}")).paginate(page: params[:page], per_page: params[:per_page] || 50)
    elsif params[:sort] == "user_invoice_name"
      report_expenses = base_query.joins(:user_invoice).order(Arel.sql("users.names #{sort_dir}")).paginate(page: params[:page], per_page: params[:per_page] || 50)
    else
      report_expenses = base_query.order(created_at: :desc).paginate(page: params[:page], per_page: params[:per_page] || 50)
    end

    render json: {
             data: ActiveModelSerializers::SerializableResource.new(report_expenses, each_serializer: ReportExpenseSerializer),
             total: total,
           }
  end

  def get_cost_center_report_expenses
    # Base query con includes para evitar N+1
    base_query = ReportExpense.includes(:cost_center, :user_invoice, :type_identification, :payment_type, :last_user_edited, :user)
                              .where(cost_center_id: params[:id])

    # Aplicar filtros de búsqueda si hay parámetros
    has_filters = params[:cost_center_id].present? || params[:user_invoice_id].present? || params[:invoice_name].present? ||
                  params[:invoice_date].present? || params[:identification].present? || params[:description].present? ||
                  params[:invoice_number].present? || params[:type_identification_id].present? || params[:payment_type_id].present? ||
                  params[:invoice_value].present? || params[:invoice_tax].present? || params[:invoice_total].present? ||
                  params[:start_date].present? || params[:end_date].present? || params[:is_acepted].present?

    if has_filters
      base_query = base_query.search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date],
                                      params[:identification], params[:description], params[:invoice_number], params[:type_identification_id],
                                      params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total],
                                      params[:start_date], params[:end_date], params[:is_acepted])
    end

    # Obtener total antes de paginar
    total = base_query.count

    # Paginar y ordenar
    report_expenses = base_query.order(created_at: :desc).paginate(page: params[:page], per_page: params[:per_page] || 50)

    render json: {
      data: ActiveModelSerializers::SerializableResource.new(report_expenses, each_serializer: ReportExpenseSerializer),
      total: total,
    }
  end

  def update_state_report_expense
    report_expense = ReportExpense.find(params[:id])
    update_status = report_expense.update(is_acepted: params[:state])

    if update_status
      render :json => {
        success: "¡El registro fue actualizado con exito!",
        register: ActiveModelSerializers::SerializableResource.new(report_expense, each_serializer: ReportExpenseSerializer),
        type: "success",
      }
    end
  end

  def create
    report_expense = ReportExpense.create(report_expense_params_create)
    if report_expense.save
      recalculate_cost_center(report_expense.cost_center_id, "reportes")
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

  def update_filter_values
    # Usar helper memoizado para evitar queries de permisos
    show_all = is_admin? || has_menu_permission?("Gastos", "Ver todos")

    if show_all
      report_expenses = ReportExpense.search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date], params[:is_acepted]).order(invoice_date: :desc)
    else
      report_expenses = ReportExpense.where(user_invoice_id: current_user.id).search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date], params[:is_acepted]).order(invoice_date: :desc)
    end

    update_status = report_expenses.update(is_acepted: true)

    if update_status
      render :json => {
               success: "Los registros fue actualizados con exito!",
               type: "success",
             }
    else
      render :json => {
               success: "El Registro No se creo!",
               type: "error",
             }
    end
  end

  def update
    update_status = @report_expense.update(report_expense_params_update)
    if update_status
      recalculate_cost_center(@report_expense.cost_center_id, "reportes")
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

  def upload_file
    status_upload = ReportExpense.import(params[:file], current_user.id)
    if status_upload
      render :json => {
               success: "#{status_upload[0].length} subieron con exito, #{status_upload[1].length} no se puedieron crear por favor revisar",
               type: "success",
               data: status_upload,
             }
    else
      render :json => {
               success: "Los Archivos no fueron importados!",
               type: "error",
             }
    end
  end

  def download_file
    # Usar helper memoizado para evitar queries de permisos
    validate = is_admin? || has_menu_permission?("Gastos", "Ver todos")
    if validate
      if params[:type] == "filtro"
        @items = ReportExpense.search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date], params[:is_acepted]).order(invoice_date: :desc)
      else
        @items = ReportExpense.all.order(invoice_date: :desc)
      end
    else
      if params[:type] == "filtro"
        @items = ReportExpense.where(user_invoice_id: current_user.id).search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date], params[:is_acepted]).order(invoice_date: :desc)
      else
        @items = ReportExpense.where(user_invoice_id: current_user.id).order(invoice_date: :desc)
      end
    end

    render xlsx: "Reporte de gastos", template: "report_expenses/download_file.xlsx.axlsx"

    #  centro = ModuleControl.find_by_name("Gastos")
    #  estado = current_user.rol.accion_modules.where(module_control_id: centro.id).where(name: "Ver todos").exists?
    #  validate = (current_user.rol.name == "Administrador" ? true : estado)

    #  if validate
    #    if params[:type] == "filtro"
    #      centro_show = ReportExpense.search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date]).order(invoice_date: :desc)
    #      puts centro_show.count
    #    else
    #      centro_show = ReportExpense.all.order(invoice_date: :desc)
    #    end
    #  else
    #    if params[:type] == "filtro"
    #      centro_show = ReportExpense.where(user_invoice_id: current_user.id).search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date]).order(invoice_date: :desc)
    #    else
    #      centro_show = ReportExpense.where(user_invoice_id: current_user.id).order(invoice_date: :desc)
    #    end
    #  end

    #  respond_to do |format|
    #    format.xlsx do
    #      task = Spreadsheet::Workbook.new
    #      sheet = task.create_worksheet

    #      rows_format = Spreadsheet::Format.new color: :black,
    #                                            weight: :normal,
    #                                            size: 13,
    #                                            align: :left

    #      centro_show.each.with_index(1) do |task, i|
    #        position = sheet.row(i)

    #        sheet.row(1).default_format = rows_format
    #        position[0] = task.cost_center.present? ? task.cost_center.code : ""
    #        position[1] = task.user_invoice.names
    #        position[2] = task.invoice_date.month.to_s + "/" + task.invoice_date.day.to_s + "/" + task.invoice_date.year.to_s
    #        position[3] = task.invoice_name
    #        position[4] = task.identification

    #        position[5] = task.description
    #        position[6] = task.invoice_number
    #        position[7] = task.type_identification.present? ? task.type_identification.name : ""
    #        position[8] = task.payment_type.present? ? task.payment_type.name : ""
    #        position[9] = task.invoice_value
    #        position[10] = task.invoice_tax

    #        sheet.row(i).height = 25
    #        sheet.column(i).width = 40
    #        sheet.row(i).default_format = rows_format
    #      end

    #      head_format = Spreadsheet::Format.new color: :white,
    #                                            weight: :bold,
    #                                            size: 12,
    #                                            pattern_bg_color: :xls_color_10,
    #                                            pattern: 2,
    #                                            vertical_align: :middle,
    #                                            align: :left

    #      position = sheet.row(0)

    #      position[0] = "Centro de costo"
    #      position[1] = "Responsable"
    #      position[2] = "Fecha de factura"
    #      position[3] = "Nombre"
    #      position[4] = "NIT / CEDULA"
    #      position[5] = "Descripcion"
    #      position[6] = "Numero de factura"
    #      position[7] = "Tipo"
    #      position[8] = "Medio de pago"
    #      position[9] = "Valor del pago"
    #      position[10] = "IVA"

    #      sheet.row(0).height = 20
    #      sheet.column(0).width = 40
    #      sheet.column(1).width = 40
    #      sheet.column(2).width = 40
    #      sheet.column(3).width = 40
    #      sheet.column(4).width = 40
    #      sheet.column(5).width = 40
    #      sheet.column(6).width = 40
    #      sheet.column(7).width = 40
    #      sheet.column(8).width = 40
    #      sheet.column(9).width = 40
    #      sheet.column(10).width = 45

    #      sheet.row(0).each.with_index { |c, i| sheet.row(0).set_format(i, head_format) }

    #      temp_file = StringIO.new

    #      task.write(temp_file)

    #      send_data(temp_file.string, :filename => "Control_de_gastos.xlsx", :disposition => "inline")
    #    end
    #  end
  end

  private

  # Memoizado para evitar queries repetidas de rol (204ms -> ~0ms)
  def is_admin?
    @_is_admin ||= current_user.rol.name == "Administrador"
  end

  def report_expense_find
    @report_expense = ReportExpense.find(params[:id])
  end

  def report_expense_params_create
    defaults = { user_id: current_user.id }
    params.permit(:user_id, :cost_center_id, :user_invoice_id, :invoice_name, :invoice_date, :description, :invoice_number, :invoice_type, :identification, :invoice_value, :invoice_tax, :invoice_total, :type_identification_id, :payment_type_id).reverse_merge(defaults)
  end

  def report_expense_params_update
    params.permit(:cost_center_id, :user_invoice_id, :invoice_name, :invoice_date, :description, :invoice_number, :invoice_type, :identification, :invoice_value, :invoice_tax, :invoice_total, :type_identification_id, :payment_type_id)
  end
end

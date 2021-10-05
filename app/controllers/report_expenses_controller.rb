class ReportExpensesController < ApplicationController
  before_action :authenticate_user!
  before_action :report_expense_find, only: [:update, :destroy]
  skip_before_action :verify_authenticity_token, only: [:upload_file]
  include ApplicationHelper

  def index
    report_expense = ModuleControl.find_by_name("Gastos")

    create = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Eliminar").exists?
    closed = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Aceptar gasto").exists?
    export = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Exportar a excel").exists?

    @estados = {
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      closed: (current_user.rol.name == "Administrador" ? true : closed),
      export: (current_user.rol.name == "Administrador" ? true : export),
    }
  end

  def indicators_expenses
    @validate = (current_user.rol.name == "Administrador" ? true : false)
  end

  def get_report_expenses
    report_expense = ModuleControl.find_by_name("Gastos")
    show_all = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Ver todos").exists?

    if params[:cost_center_id] || params[:user_invoice_id] || params[:invoice_name] || params[:invoice_date] || params[:identification] || params[:description] || params[:invoice_number] || params[:type_identification_id] || params[:payment_type_id] || params[:invoice_value] || params[:invoice_tax] || params[:invoice_tax] || params[:invoice_total] || params[:start_date] || params[:end_date]
      if show_all
        report_expenses = ReportExpense.search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date]).paginate(page: params[:page], :per_page => 10).order(invoice_date: :desc)
        total = ReportExpense.search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date]).count
      else
        report_expenses = ReportExpense.where(user_invoice_id: current_user.id).search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date]).paginate(page: params[:page], :per_page => 10).order(invoice_date: :desc)
        total = ReportExpense.where(user_invoice_id: current_user.id).search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date]).count
      end
    else
      if show_all
        report_expenses = ReportExpense.all.paginate(page: params[:page], :per_page => 10).order(invoice_date: :desc)
        total = ReportExpense.all.count
      else
        report_expenses = ReportExpense.where(user_invoice_id: current_user.id).paginate(page: params[:page], :per_page => 10).order(invoice_date: :desc)
        total = ReportExpense.where(user_invoice_id: current_user.id).count
      end
    end

    render json: {
             data: ActiveModelSerializers::SerializableResource.new(report_expenses, each_serializer: ReportExpenseSerializer),
             total: total,
           }
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
    report_expense = ModuleControl.find_by_name("Gastos")
    show_all = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Ver todos").exists?

    if show_all
      report_expenses = ReportExpense.search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date]).order(invoice_date: :desc)
    else
      report_expenses = ReportExpense.where(user_invoice_id: current_user.id).search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date]).order(invoice_date: :desc)
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
               data: status_upload
             }
    else
      render :json => {
               success: "Los Archivos no fueron importados!",
               type: "error",
             }
    end
  end

  def download_file
    centro = ModuleControl.find_by_name("Gastos")
    estado = current_user.rol.accion_modules.where(module_control_id: centro.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)

    if validate
      if params[:type] == "filtro"
        centro_show = ReportExpense.search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date]).order(invoice_date: :desc)
        puts centro_show.count
      else
        centro_show = ReportExpense.all.order(invoice_date: :desc)
      end
    else
      if params[:type] == "filtro"
        centro_show = ReportExpense.where(user_invoice_id: current_user.id).search(params[:cost_center_id], params[:user_invoice_id], params[:invoice_name], params[:invoice_date], params[:identification], params[:description], params[:invoice_number], params[:type_identification_id], params[:payment_type_id], params[:invoice_value], params[:invoice_tax], params[:invoice_total], params[:start_date], params[:end_date]).order(invoice_date: :desc)
      else
        centro_show = ReportExpense.where(user_invoice_id: current_user.id).order(invoice_date: :desc)
      end
    end

    respond_to do |format|
      format.xls do
        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet

        rows_format = Spreadsheet::Format.new color: :black,
                                              weight: :normal,
                                              size: 13,
                                              align: :left

        centro_show.each.with_index(1) do |task, i|
          position = sheet.row(i)

          sheet.row(1).default_format = rows_format
          position[0] = task.cost_center.present? ? task.cost_center.code : ""
          position[1] = task.user_invoice.names
          position[2] = task.invoice_date.month.to_s + "/" + task.invoice_date.day.to_s + "/" + task.invoice_date.year.to_s 
          position[3] = task.invoice_name
          position[4] = task.identification

          position[5] = task.description
          position[6] = task.invoice_number
          position[7] = task.type_identification.present? ? task.type_identification.name : ""
          position[8] = task.payment_type.present? ? task.payment_type.name : ""
          position[9] = task.invoice_value
          position[10] = task.invoice_tax

          sheet.row(i).height = 25
          sheet.column(i).width = 40
          sheet.row(i).default_format = rows_format
        end

        head_format = Spreadsheet::Format.new color: :white,
                                              weight: :bold,
                                              size: 12,
                                              pattern_bg_color: :xls_color_10,
                                              pattern: 2,
                                              vertical_align: :middle,
                                              align: :left

        position = sheet.row(0)

        position[0] = "Centro de costo"
        position[1] = "Responsable"
        position[2] = "Fecha de factura"
        position[3] = "Nombre"
        position[4] = "NIT / CEDULA"
        position[5] = "Descripcion"
        position[6] = "Numero de factura"
        position[7] = "Tipo"
        position[8] = "Medio de pago"
        position[9] = "Valor del pago"
        position[10] = "IVA"

        sheet.row(0).height = 20
        sheet.column(0).width = 40
        sheet.column(1).width = 40
        sheet.column(2).width = 40
        sheet.column(3).width = 40
        sheet.column(4).width = 40
        sheet.column(5).width = 40
        sheet.column(6).width = 40
        sheet.column(7).width = 40
        sheet.column(8).width = 40
        sheet.column(9).width = 40
        sheet.column(10).width = 45

        sheet.row(0).each.with_index { |c, i| sheet.row(0).set_format(i, head_format) }

        temp_file = StringIO.new

        task.write(temp_file)

        send_data(temp_file.string, :filename => "Control_de_gastos.xls", :disposition => "inline")
      end
    end
  end

  private

  def report_expense_find
    @report_expense = ReportExpense.find(params[:id])
  end

  def report_expense_params_create
    defaults = { user_id: current_user.id }
    params.permit(:user_id, :cost_center_id, :user_invoice_id, :invoice_name, :invoice_date, :description, :invoice_number, :invoice_type, :identification, :invoice_value, :invoice_tax, :invoice_total, :type_identification_id, :payment_type_id).reverse_merge(defaults)
  end

  def report_expense_params_update
    params.permit(:user_id, :cost_center_id, :user_invoice_id, :invoice_name, :invoice_date, :description, :invoice_number, :invoice_type, :identification, :invoice_value, :invoice_tax, :invoice_total, :type_identification_id, :payment_type_id)
  end
end

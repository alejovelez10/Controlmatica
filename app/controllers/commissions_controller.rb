class CommissionsController < ApplicationController
  before_action :authenticate_user!
  before_action :commission_find, only: [:update, :destroy]

  def index
    report_expense = ModuleControl.find_by_name("Comisiones")

    create = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Eliminar").exists?

    accept_commission = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Aceptar comisión").exists?
    export_exel = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Exportar a excel").exists?
    change_responsible = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Cambiar responsable").exists?

    @estados = {
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      accept_commission: (current_user.rol.name == "Administrador" ? true : accept_commission),
      export_exel: (current_user.rol.name == "Administrador" ? true : export_exel),
      change_responsible: (current_user.rol.name == "Administrador" ? true : change_responsible),
    }
  end

  def get_commissions
    report_expense = ModuleControl.find_by_name("Comisiones")
    show_all = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Ver todos").exists?
    validation = (current_user.rol.name == "Administrador" ? true : show_all)

    if params[:user_invoice_id] || params[:start_date] || params[:end_date] || params[:customer_invoice_id] || params[:observation] || params[:hours_worked] || params[:total_value] || params[:is_acepted]
      if validation
        commissions = Commission.search(params[:user_invoice_id], params[:start_date], params[:end_date], params[:customer_invoice_id], params[:observation], params[:hours_worked], params[:total_value], params[:is_acepted]).paginate(page: params[:page], :per_page => 10)
        total = Commission.search(params[:user_invoice_id], params[:start_date], params[:end_date], params[:customer_invoice_id], params[:observation], params[:hours_worked], params[:total_value], params[:is_acepted]).count
      else
        commissions = Commission.where(user_invoice_id: current_user.id).search(params[:user_invoice_id], params[:start_date], params[:end_date], params[:customer_invoice_id], params[:observation], params[:hours_worked], params[:total_value], params[:is_acepted]).paginate(page: params[:page], :per_page => 10)
        total = Commission.where(user_invoice_id: current_user.id).search(params[:user_invoice_id], params[:start_date], params[:end_date], params[:customer_invoice_id], params[:observation], params[:hours_worked], params[:total_value], params[:is_acepted]).count
      end
    else
      if validation
        puts "ENTRO A VALIDATION"
        commissions = Commission.all.paginate(page: params[:page], :per_page => 10)
        total = Commission.all.count
      else
        puts "no ENTRO A VALIDATION"
        commissions = Commission.where(user_invoice_id: current_user.id).paginate(page: params[:page], :per_page => 10)
        total = Commission.where(user_invoice_id: current_user.id).count
      end
    end

    render json: {
      data: ActiveModelSerializers::SerializableResource.new(commissions, each_serializer: CommissionSerializer),
      total: total,
    }
  end

  def update_filter_values_commissions
    report_expense = ModuleControl.find_by_name("Comisiones")
    show_all = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Ver todos").exists?
    validation = (current_user.rol.name == "Administrador" ? true : show_all)

    if validation
      report_expenses = Commission.search(params[:user_invoice_id], params[:start_date], params[:end_date], params[:customer_invoice_id], params[:observation], params[:hours_worked], params[:total_value], params[:is_acepted])
    else
      report_expenses = Commission.where(user_invoice_id: current_user.id).search(params[:user_invoice_id], params[:start_date], params[:end_date], params[:customer_invoice_id], params[:observation], params[:hours_worked], params[:total_value], params[:is_acepted])
    end

    update_status = report_expenses.update(is_acepted: true)

    if update_status
      render :json => {
        success: "Los registros fue actualizados con exito!",
        data: ActiveModelSerializers::SerializableResource.new(report_expenses, each_serializer: CommissionSerializer),
        type: "success",
      }
    else
      render :json => {
        success: "El Registro No se creo!",
        type: "error",
      }
    end
  end

  def download_file
    report_expense = ModuleControl.find_by_name("Comisiones")
    show_all = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)

    if validate
      if params[:type] == "filtro"
        @items = Commission.search(params[:user_invoice_id], params[:start_date], params[:end_date], params[:customer_invoice_id], params[:observation], params[:hours_worked], params[:total_value], params[:is_acepted])
      else
        @items = Commission.all
      end
    else
      if params[:type] == "filtro"
        @items = Commission.where(user_invoice_id: current_user.id).search(params[:user_invoice_id], params[:start_date], params[:end_date], params[:customer_invoice_id], params[:observation], params[:hours_worked], params[:total_value], params[:is_acepted])
      else
        @items = Commission.where(user_invoice_id: current_user.id)
      end
    end

    render xlsx: "Reporte de comisiones", template: "commissions/download_file.xlsx.axlsx"
  end

  def update_state_commission
    commission = Commission.find(params[:id])
    update_status = commission.update(is_acepted: params[:state], last_user_edited_id: current_user.id)

    if update_status
      render :json => {
        success: "¡El registro fue actualizado con exito!",
        register: ActiveModelSerializers::SerializableResource.new(commission, each_serializer: CommissionSerializer),
        type: "success",
      }
    end
  end

  def create
    commission = Commission.create(commission_create)
    if commission.save
      render :json => {
               success: "El Registro fue creado con exito!",
               register: ActiveModelSerializers::SerializableResource.new(commission, each_serializer: CommissionSerializer),
               type: "success",
             }
    else
      render :json => {
               success: "El Registro No se creo!",
               message: commission.errors.full_messages,
               type: "error",
             }
    end
  end

  def update
    update_status = @commission.update(commission_update)
    if update_status
      render :json => {
               success: "El Registro fue actualizado con exito!",
               register: ActiveModelSerializers::SerializableResource.new(@commission, each_serializer: CommissionSerializer),
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
    if @commission.destroy
      render :json => {
               success: "El Registro fue eliminado con exito!",
               type: "success",
             }
    end
  end

  private

  def commission_find
    @commission = Commission.find(params[:id])
  end

  def commission_create
    defaults = { user_id: current_user.id }
    params.permit(:user_id, :user_invoice_id, :start_date, :end_date, :customer_invoice_id, :observation, :hours_worked, :total_value, :is_acepted, :cost_center_id, :customer_report_id).reverse_merge(defaults)
  end

  def commission_update
    defaults = { last_user_edited_id: current_user.id }
    params.permit(:last_user_edited_id, :user_invoice_id, :start_date, :end_date, :customer_invoice_id, :observation, :hours_worked, :total_value, :is_acepted, :cost_center_id, :customer_report_id).reverse_merge(defaults)
  end
end

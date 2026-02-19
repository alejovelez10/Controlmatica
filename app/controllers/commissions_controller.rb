class CommissionsController < ApplicationController
  before_action :authenticate_user!
  before_action :commission_find, only: [:update, :destroy]
  include ApplicationHelper

  def index
    module_control = ModuleControl.find_by_name("Comisiones")
    is_admin = current_user.rol.name == "Administrador"

    # Una sola query para obtener todos los permisos del modulo
    permission_names = current_user.rol.accion_modules
      .where(module_control_id: module_control.id)
      .pluck(:name)

    @estados = {
      create: is_admin || permission_names.include?("Crear"),
      edit: is_admin || permission_names.include?("Editar"),
      delete: is_admin || permission_names.include?("Eliminar"),
      accept_commission: is_admin || permission_names.include?("Aceptar comisión"),
      export_exel: is_admin || permission_names.include?("Exportar a excel"),
      change_responsible: is_admin || permission_names.include?("Cambiar responsable"),
      edit_after_acepted: is_admin || permission_names.include?("Editar despues de aceptado"),
      delete_after_acepted: is_admin || permission_names.include?("Eliminar despues de aceptado"),
      change_value_hour: is_admin || permission_names.include?("Cambiar valor hora"),
      force_hour: is_admin || permission_names.include?("Forzar horas"),
    }
  end

  def get_commissions
    # Administrador SIEMPRE ve todo, sin importar permisos
    is_admin = current_user.rol.name == "Administrador"
    show_all = is_admin || has_menu_permission?("Comisiones", "Ver todos")

    # Base query con includes para evitar N+1
    base_query = Commission.includes(:user, :user_invoice, :last_user_edited, :customer_invoice, :customer_report, :cost_center)

    # Filtrar por usuario si no tiene permiso de ver todos
    unless show_all
      base_query = base_query.where(user_invoice_id: current_user.id)
    end

    # Aplicar filtros de busqueda si hay parametros
    has_filters = params[:user_invoice_id].present? || params[:start_date].present? || params[:end_date].present? ||
                  params[:customer_invoice_id].present? || params[:observation].present? || params[:hours_worked].present? ||
                  params[:total_value].present? || params[:is_acepted].present?

    if has_filters
      base_query = base_query.search(params[:user_invoice_id], params[:start_date], params[:end_date], params[:customer_invoice_id],
                                     params[:observation], params[:hours_worked], params[:total_value], params[:is_acepted])
    end

    # Obtener total antes de paginar (una sola query con count)
    total = base_query.count

    # Paginar y ordenar
    commissions = base_query.order(created_at: :desc).paginate(page: params[:page], per_page: 10)

    render json: {
      data: ActiveModelSerializers::SerializableResource.new(commissions, each_serializer: CommissionSerializer),
      total: total,
    }
  end

  def update_filter_values_commissions
    # Administrador SIEMPRE ve todo
    is_admin = current_user.rol.name == "Administrador"
    show_all = is_admin || has_menu_permission?("Comisiones", "Ver todos")

    # Base query con includes para evitar N+1
    base_query = Commission.includes(:user, :user_invoice, :last_user_edited, :customer_invoice, :customer_report, :cost_center)

    # Filtrar por usuario si no tiene permiso de ver todos
    unless show_all
      base_query = base_query.where(user_invoice_id: current_user.id)
    end

    # Aplicar filtros de busqueda
    commissions = base_query.search(params[:user_invoice_id], params[:start_date], params[:end_date], params[:customer_invoice_id],
                                    params[:observation], params[:hours_worked], params[:total_value], params[:is_acepted])

    update_status = commissions.update_all(is_acepted: true)

    if update_status
      # Recargar con includes para el serializer
      updated_commissions = commissions.reload
      render :json => {
        success: "Los registros fue actualizados con exito!",
        data: ActiveModelSerializers::SerializableResource.new(updated_commissions, each_serializer: CommissionSerializer),
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
    # Administrador SIEMPRE ve todo
    is_admin = current_user.rol.name == "Administrador"
    show_all = is_admin || has_menu_permission?("Comisiones", "Ver todos")

    # Base query con includes para evitar N+1 en el template xlsx
    base_query = Commission.includes(:user, :user_invoice, :last_user_edited, :customer_invoice, :customer_report, :cost_center)

    # Filtrar por usuario si no tiene permiso de ver todos
    unless show_all
      base_query = base_query.where(user_invoice_id: current_user.id)
    end

    if params[:type] == "filtro"
      @items = base_query.search(params[:user_invoice_id], params[:start_date], params[:end_date], params[:customer_invoice_id],
                                 params[:observation], params[:hours_worked], params[:total_value], params[:is_acepted])
    else
      @items = base_query
    end

    render xlsx: "Reporte de comisiones", template: "commissions/download_file.xlsx.axlsx"
  end

  def update_state_commission
    commission = Commission.includes(:user, :user_invoice, :last_user_edited, :customer_invoice, :customer_report, :cost_center)
                           .find(params[:id])
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
    valor1 = commission_create["value_hour"].to_s.gsub("$", "").gsub(",", "")
    params["value_hour"] = valor1
    commission = Commission.create(commission_create)
    if commission.save
      # Recargar con includes para el serializer
      commission = Commission.includes(:user, :user_invoice, :last_user_edited, :customer_invoice, :customer_report, :cost_center)
                             .find(commission.id)
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
    valor1 = commission_create["value_hour"].to_s.gsub("$", "").gsub(",", "")
    params["value_hour"] = valor1
    update_status = @commission.update(commission_update)
    if update_status
      # Recargar con includes para el serializer
      @commission = Commission.includes(:user, :user_invoice, :last_user_edited, :customer_invoice, :customer_report, :cost_center)
                              .find(@commission.id)
      render :json => {
               success: "El Registro fue actualizado con exito!",
               register: ActiveModelSerializers::SerializableResource.new(@commission, each_serializer: CommissionSerializer),
               type: "success",
             }
    else
      render :json => {
               success: "El Registro No se creo!",
               message: @commission.errors.full_messages,
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
    params.permit(:user_id, :user_invoice_id, :start_date, :end_date, :customer_invoice_id, :observation, :hours_worked, :total_value, :is_acepted, :cost_center_id, :customer_report_id, :value_hour).reverse_merge(defaults)
  end

  def commission_update
    defaults = { last_user_edited_id: current_user.id }
    params.permit(:last_user_edited_id, :user_invoice_id, :start_date, :end_date, :customer_invoice_id, :observation, :hours_worked, :total_value, :is_acepted, :cost_center_id, :customer_report_id, :value_hour).reverse_merge(defaults)
  end
end

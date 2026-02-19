class CommissionRelationsController < ApplicationController
  before_action :authenticate_user!
  before_action :commission_relation_find, only: [:update, :destroy]
  include ApplicationHelper

  def index
    # Usar helpers memoizados - evita queries de ModuleControl y accion_modules
    @estados = {
      create: is_admin? || has_menu_permission?("Relación de comisiones", "Crear"),
      edit: is_admin? || has_menu_permission?("Relación de comisiones", "Editar"),
      delete: is_admin? || has_menu_permission?("Relación de comisiones", "Eliminar"),
      pdf: is_admin? || has_menu_permission?("Relación de comisiones", "Ver pdf"),
    }
  end

  def get_commission_relations
    # Usar helper memoizado para evitar queries de permisos
    show_all = is_admin? || has_menu_permission?("Relación de comisiones", "Ver todos")

    # Base query con includes para evitar N+1 (serializer usa user_report, user_direction, last_user_edited, user)
    base_query = CommissionRelation.includes(:user_report, :user_direction, :last_user_edited, :user)

    # Filtrar por usuario si no tiene permiso de ver todos
    base_query = base_query.where(user_report_id: current_user.id) unless show_all

    # Aplicar filtros de búsqueda si hay parámetros
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

    # Paginar y ordenar
    commission_relations = base_query.order(created_at: :desc).paginate(page: params[:page], per_page: 10)

    render json: {
      data: ActiveModelSerializers::SerializableResource.new(commission_relations, each_serializer: CommissionRelationSerializer),
      total: total,
    }
  end

  def pdf
    @expense_ratio = CommissionRelation.find(params[:id])
    @commissions = Commission.where(user_invoice_id: @expense_ratio.user_report_id).where("start_date >= ?", @expense_ratio.start_date).where("end_date <= ?", @expense_ratio.end_date)

    respond_to do |format|
      #format.html
      format.pdf do
        render :pdf => "formatos1",
               :template => "commission_relations/pdfs/commission_relations.pdf.erb",
               :layout => "pdf.html.erb",
               :orientation => "landscape",
               :footer => {
                 :spacing => 5,
                 :html => {
                   :template => "commission_relations/pdfs/footer.pdf.erb",
                 },
               },
               :show_as_html => params[:debug].present?
      end
    end
  end

  def create
    commission_relation = CommissionRelation.create(commission_relation_create)
    if commission_relation.save
      render :json => {
               success: "El Registro fue creado con exito!",
               register: ActiveModelSerializers::SerializableResource.new(commission_relation, each_serializer: CommissionRelationSerializer),
               type: "success",
             }
    else
      render :json => {
               success: "El Registro No se creo!",
               message: commission_relation.errors.full_messages,
               type: "error",
             }
    end
  end

  def update
    update_status = @commission_relation.update(commission_relation_update)
    if update_status
      render :json => {
               success: "El Registro fue actualizado con exito!",
               register: ActiveModelSerializers::SerializableResource.new(@commission_relation, each_serializer: CommissionRelationSerializer),
               type: "success",
             }
    else
      render :json => {
               success: "El Registro No se creo!",
               message: @commission_relation.errors.full_messages,
               type: "error",
             }
    end
  end

  def destroy
    if @commission_relation.destroy
      render :json => {
               success: "El Registro fue eliminado con exito!",
               type: "success",
             }
    end
  end

  private

  def commission_relation_find
    @commission_relation = CommissionRelation.find(params[:id])
  end

  def commission_relation_create
    defaults = { user_id: current_user.id }
    params.permit(:user_id, :creation_date, :user_report_id, :start_date, :end_date, :area, :observations, :user_direction_id).reverse_merge(defaults)
  end

  def commission_relation_update
    defaults = { last_user_edited_id: current_user.id }
    params.permit(:last_user_edited_id, :creation_date, :user_report_id, :start_date, :end_date, :area, :observations, :user_direction_id).reverse_merge(defaults)
  end

  # Memoizado para evitar queries repetidas de rol
  def is_admin?
    @_is_admin ||= current_user.rol.name == "Administrador"
  end
end

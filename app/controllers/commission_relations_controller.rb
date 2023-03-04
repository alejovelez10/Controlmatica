class CommissionRelationsController < ApplicationController
  before_action :authenticate_user!
  before_action :commission_relation_find, only: [:update, :destroy]

  def index
    report_expense = ModuleControl.find_by_name("Relación de comisiones")

    create = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Eliminar").exists?
    show_pdf = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Ver pdf").exists?

    @estados = {
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      pdf: (current_user.rol.name == "Administrador" ? true : show_pdf),
    }
  end

  def get_commission_relations
    report_expense = ModuleControl.find_by_name("Relación de comisiones")
    show_all = current_user.rol.accion_modules.where(module_control_id: report_expense.id).where(name: "Ver todos").exists?
    validation = (current_user.rol.name == "Administrador" ? true : show_all)

    if params[:user_direction_id] || params[:user_report_id] || params[:observations] || params[:start_date] || params[:end_date] || params[:creation_date] || params[:area]
      if validation
        expense_ratios = CommissionRelation.search(params[:user_direction_id], params[:user_report_id], params[:observations], params[:start_date], params[:end_date], params[:creation_date], params[:area]).paginate(page: params[:page], :per_page => 10)
        total = CommissionRelation.search(params[:user_direction_id], params[:user_report_id], params[:observations], params[:start_date], params[:end_date], params[:creation_date], params[:area]).count
      else
        expense_ratios = CommissionRelation.where(user_report_id: current_user.id).search(params[:user_direction_id], params[:user_report_id], params[:observations], params[:start_date], params[:end_date], params[:creation_date], params[:area]).paginate(page: params[:page], :per_page => 10)
        total = CommissionRelation.where(user_report_id: current_user.id).search(params[:user_direction_id], params[:user_report_id], params[:observations], params[:start_date], params[:end_date], params[:creation_date], params[:area]).count
      end
    else
      if validation
        expense_ratios = CommissionRelation.all.paginate(page: params[:page], :per_page => 10)
        total = CommissionRelation.all.count
      else
        expense_ratios = CommissionRelation.where(user_report_id: current_user.id).paginate(page: params[:page], :per_page => 10)
        total = CommissionRelation.where(user_report_id: current_user.id).count
      end
    end

    render json: {
      data: ActiveModelSerializers::SerializableResource.new(expense_ratios.order(created_at: :desc), each_serializer: CommissionRelationSerializer),
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
end

class ContractorsController < ApplicationController
  before_action :set_contractor, only: [:destroy, :update]
  before_action :authenticate_user!

  include ApplicationHelper

  def index
    mod = ModuleControl.find_by_name("Tableristas")
    is_admin = current_user.rol.name == "Administrador"
    permisos = current_user.rol.accion_modules.where(module_control_id: mod.id).pluck(:name)

    @estados = {
      create: is_admin || permisos.include?("Crear"),
      edit: is_admin || permisos.include?("Editar"),
      edit_all: is_admin || permisos.include?("Editar todos"),
      delete: is_admin || permisos.include?("Eliminar"),
      download_file: is_admin || permisos.include?("Descargar excel")
    }
  end

  SORTABLE_COLUMNS = %w[sales_date hours description ammount].freeze

  def get_contractors
    contractors = Contractor.all.includes(:cost_center, :user_execute, :user, :last_user_edited)

    if params[:search].present?
      term = "%#{params[:search].downcase}%"
      contractors = contractors.joins(:cost_center).where(
        "LOWER(contractors.description) LIKE ? OR LOWER(cost_centers.code) LIKE ?", term, term
      )
    end

    # Advanced filters
    contractors = contractors.where(user_execute_id: params[:user_execute_id]) if params[:user_execute_id].present?
    contractors = contractors.where(cost_center_id: params[:cost_center_id]) if params[:cost_center_id].present?
    contractors = contractors.where("contractors.sales_date >= ?", params[:date_desde]) if params[:date_desde].present?
    contractors = contractors.where("contractors.sales_date <= ?", params[:date_hasta]) if params[:date_hasta].present?
    if params[:descripcion].present?
      desc_term = "%#{params[:descripcion].downcase}%"
      contractors = contractors.where("LOWER(contractors.description) LIKE ?", desc_term)
    end

    # sort
    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      contractors = contractors.order(params[:sort] => direction)
    else
      contractors = contractors.order(created_at: :desc)
    end

    page = (params[:page] || 1).to_i
    per_page = [(params[:per_page] || 10).to_i, 100].min
    total = contractors.except(:includes).count
    paginated = contractors.offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: paginated.map { |c| {
        id: c.id, sales_date: c.sales_date, hours: c.hours, description: c.description,
        ammount: c.ammount, cost_center_id: c.cost_center_id, user_execute_id: c.user_execute_id,
        cost_center: c.cost_center.present? ? { code: c.cost_center.code, execution_state: c.cost_center.execution_state } : nil,
        user_execute: c.user_execute.present? ? { names: c.user_execute.names, id: c.user_execute.id } : nil,
        user: c.user.present? ? { names: c.user.names, id: c.user.id } : nil,
        user_update: c.last_user_edited.present? ? { names: c.last_user_edited.names, id: c.last_user_edited.id } : nil,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }},
      meta: { total: total, page: page, per_page: per_page, total_pages: (total.to_f / per_page).ceil }
    }
  end

  def download_file

    if params[:ids] != "todos"
      contractor = Contractor.search(params[:user_execute_id], params[:sales_date], params[:cost_center_id], params[:date_desde], params[:date_hasta], params[:descripcion]).order(created_at: :desc)
    else
      contractor = Contractor.all
    end

    respond_to do |format|

      format.xls do

        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet

        rows_format = Spreadsheet::Format.new color: :black,
        weight: :normal,
        size: 13,
        align: :left

        contractor.each.with_index(1) do |task, i|

          position = sheet.row(i)

          sheet.row(1).default_format = rows_format
          position[0] = task.sales_date
          position[1] = task.cost_center.present? ? task.cost_center.code : ""
          position[2] = task.hours
          position[3] = task.user_execute.present? ? task.user_execute.names : ""
          position[4] = task.description



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

        position[0] = "Fecha"
        position[1] = "Centro de costo"
        position[2] = "Horas"
        position[3] = "Trabajo realizado por"
        position[4] = "Descripcion"




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

        sheet.column(10).width = 40

        sheet.row(0).each.with_index { |c, i| sheet.row(0).set_format(i, head_format) }



        temp_file = StringIO.new

        task.write(temp_file)

        send_data(temp_file.string, :filename => "Tableristas.xls", :disposition => 'inline')

        end
    end

  end

  def create
    valor1 = contractor_params_create["ammount"].gsub('$','').gsub(',','')
    params["ammount"] = valor1

  	@contractor = Contractor.create(contractor_params_create)
      if @contractor.save
        recalculate_cost_center(@contractor.cost_center_id, "contractor")
        render :json => {
          message: "¡El Registro fue creado con exito!",
          register: contractor_object(@contractor),
          type: "success"
        }
      else
        render :json => {
          message: "¡El Registro no fue creado!",
          type: "error",
          message_error: @contractor.errors.full_messages
        }
    end

  end

  def update
    if params["ammount"].present?
      if contractor_params_update["ammount"].class.to_s != "Integer"
        valor1 = contractor_params_update["ammount"].gsub('$','').gsub(',','')
        params["ammount"] = valor1
      end
    end

    if @contractor.update(contractor_params_update.merge!(update_user: current_user.id))
      recalculate_cost_center(@contractor.cost_center_id)
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        register: contractor_object(@contractor),
        type: "success"
      }
    else
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @contractor.errors.full_messages
      }
    end
  end

  def destroy
    if @contractor.destroy
      render :json => @contractor
    else
      render :json => @contractor.errors.full_messages
    end
  end

  private

    def set_contractor
      @contractor = Contractor.find(params[:id])
    end

    def contractor_object(contractor)
      {
        id: contractor.id,
        sales_date: contractor.sales_date,
        hours: contractor.hours,
        description: contractor.description,
        ammount: contractor.ammount,
        cost_center_id: contractor.cost_center_id,
        user_execute_id: contractor.user_execute_id,
        cost_center: contractor.cost_center.present? ? { code: contractor.cost_center.code, execution_state: contractor.cost_center.execution_state } : nil,
        user_execute: contractor.user_execute.present? ? { names: contractor.user_execute.names, id: contractor.user_execute.id } : nil,
      }
    end

    def contractor_params_create
      defaults = { user_id: current_user.id}
      params.permit(:sales_date, :sales_number, :ammount, :cost_center_id, :user_id, :description, :hours, :user_execute_id, :update_user).reverse_merge(defaults)
    end

    def contractor_params_update
      params.permit(:sales_date, :sales_number, :ammount, :cost_center_id, :description, :hours, :user_execute_id, :update_user)
    end
end

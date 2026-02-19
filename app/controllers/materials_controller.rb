class MaterialsController < ApplicationController
  before_action :set_material, only: [:destroy, :update]
  before_action :authenticate_user!
  include ApplicationHelper

  SORTABLE_COLUMNS = %w[sales_date sales_number amount description delivery_date sales_state].freeze

  def index
    mod = ModuleControl.find_by_name("Materiales")
    is_admin = current_user.rol.name == "Administrador"
    permisos = current_user.rol.accion_modules.where(module_control_id: mod.id).pluck(:name)

    @estados = {
      create: is_admin || permisos.include?("Crear"),
      edit: is_admin || permisos.include?("Editar"),
      edit_all: is_admin || permisos.include?("Editar todos"),
      delete: is_admin || permisos.include?("Eliminar"),
      update_state: is_admin || permisos.include?("Forzar estados"),
      download_file: is_admin || permisos.include?("Descargar excel"),
    }
  end

  def get_materials
    materials = Material.all.includes(:cost_center, :provider, :user, :last_user_edited, :material_invoices)

    if params[:search].present?
      term = "%#{params[:search].downcase}%"
      materials = materials.joins(:cost_center, :provider).where(
        "LOWER(materials.description) LIKE ? OR LOWER(materials.sales_number) LIKE ? OR LOWER(providers.name) LIKE ? OR LOWER(cost_centers.code) LIKE ?",
        term, term, term, term
      )
    end

    # Advanced filters
    materials = materials.where(provider_id: params[:provider_id]) if params[:provider_id].present?
    materials = materials.where(cost_center_id: params[:cost_center_id]) if params[:cost_center_id].present?
    materials = materials.where(sales_state: params[:estado]) if params[:estado].present?
    materials = materials.where(sales_number: params[:sales_number]) if params[:sales_number].present?
    materials = materials.where("materials.sales_date >= ?", params[:date_desde]) if params[:date_desde].present?
    materials = materials.where("materials.sales_date <= ?", params[:date_hasta]) if params[:date_hasta].present?
    if params[:description].present?
      desc_term = "%#{params[:description].downcase}%"
      materials = materials.where("LOWER(materials.description) LIKE ?", desc_term)
    end
    if params[:sales_date].present? && params[:date_desde].blank? && params[:date_hasta].blank?
      materials = materials.where(sales_date: params[:sales_date])
    end

    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      materials = materials.order(params[:sort] => direction)
    else
      materials = materials.order(created_at: :desc)
    end

    page = (params[:page] || 1).to_i
    per_page = [(params[:per_page] || 50).to_i, 100].min
    total = materials.except(:includes).count
    paginated = materials.offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: ActiveModelSerializers::SerializableResource.new(paginated, each_serializer: MaterialSerializer),
      meta: { total: total, page: page, per_page: per_page, total_pages: (total.to_f / per_page).ceil }
    }
  end

  def update_state_materials
    material = Material.find(params[:id])
    update_material = material.update(sales_state: params[:state])

    if update_material
      render :json => {
        message: "¡El Estado fue actualizado con exito!",
        type: "success",
      }
    end
  end

  def download_file
    if params[:ids] != "todos"
      materials = Material.search(params[:provider_id], params[:sales_date], params[:description], params[:cost_center_id], params[:estado], params[:date_desde], params[:date_hasta], params[:sales_number]).order(created_at: :desc)
    else
      materials = Material.all
    end

    respond_to do |format|
      format.xls do
        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet

        rows_format = Spreadsheet::Format.new color: :black,
                                              weight: :normal,
                                              size: 13,
                                              align: :left

        materials.each.with_index(1) do |task, i|
          position = sheet.row(i)

          sheet.row(1).default_format = rows_format
          position[0] = task.cost_center.present? ? task.cost_center.code : ""
          position[1] = task.provider.present? ? task.provider.name : ""
          position[2] = task.sales_number
          position[3] = task.amount
          position[4] = task.description
          position[5] = task.sales_date
          position[6] = task.delivery_date
          position[7] = task.provider_invoice_value
          position[8] = task.sales_state

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
        position[1] = "Proveedor"
        position[2] = "# Orden"
        position[3] = "Valor"
        position[4] = "Descripción"
        position[5] = "Fecha de Orden"
        position[6] = "Fecha Entrega"
        position[7] = "Valor Factura"
        position[8] = "Estado"

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

        send_data(temp_file.string, :filename => "Materiales.xls", :disposition => "inline")
      end
    end
  end

  def create
    valor1 = material_params_create["amount"].gsub("$", "").gsub(",", "")
    params["amount"] = valor1

    @material = Material.create(material_params_create)
    if @material.save
      recalculate_cost_center(@material.cost_center_id, "materiales")
      render :json => {
               message: "¡El Registro fue creado con exito!",
               register: material_object(@material),
               type: "success",
             }

      Material.set_state(@material.id)
    else
      render :json => {
               message: "¡El Registro no fue creado!",
               type: "error",
               message_error: @material.errors.full_messages,
             }
    end
  end

  def update
    if material_params_update["amount"].class.to_s != "Integer" && material_params_update["amount"].class.to_s != "Float"
      valor1 = material_params_update["amount"].gsub("$", "").gsub(",", "")
      params["amount"] = valor1
    end

    if @material.update(material_params_update.merge!(update_user: current_user.id))
      recalculate_cost_center(@material.cost_center_id)
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        register: material_object(@material),
        type: "success",
      }

      Material.set_state(@material.id)
    else
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @material.errors.full_messages,
      }
    end
  end

  def destroy
    if @material.destroy
      render :json => @material
    else
      render :json => @material.errors.full_messages
    end
  end

  private

  def set_material
    @material = Material.find(params[:id])
  end

  def material_object(material)
    {
      id: material.id,
      amount: material.amount,
      cost_center: { code: material.cost_center.code },
      cost_center_id: material.cost_center.id,
      created_at: material.created_at,
      delivery_date: material.delivery_date,
      description: material.description,
      provider: { name: material.provider.name },
      provider_id: material.provider_id,
      provider_invoice_number: material.provider_invoice_number,
      provider_invoice_value: material.provider_invoice_value,
      sales_date: material.sales_date,
      sales_number: material.sales_number,
      sales_state: material.sales_state,
      update_user: material.update_user,
      updated_at: material.updated_at,
      user_id: material.user_id,
    }
  end

  def material_params_create
    defaults = { user_id: current_user.id }
    params.permit(:provider_id, :sales_date, :sales_number, :amount, :delivery_date, :sales_state, :description, :provider_invoice_number, :provider_invoice_value, :cost_center_id, :user_id, :update_user).reverse_merge(defaults)
  end

  def material_params_update
    params.permit(:provider_id, :sales_date, :sales_number, :amount, :delivery_date, :sales_state, :description, :provider_invoice_number, :provider_invoice_value, :cost_center_id, :update_user)
  end
end

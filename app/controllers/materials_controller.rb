class MaterialsController < ApplicationController
  before_action :set_material, only: [:destroy, :update]
  before_action :authenticate_user!
  include ApplicationHelper
  include ExcelXls

  SORTABLE_COLUMNS = %w[sales_date sales_number amount description delivery_date sales_state].freeze

  # Las columnas de la tabla en el mismo orden. Una fila por factura del
  # material (o una sola si no tiene); el valor del material y el total
  # facturado van solo en la primera, para que sumar en Excel no los duplique.
  ENCABEZADOS_EXCEL = [
    "Proveedor", "Centro de costo", "# Orden", "Valor", "Descripción", "Fecha de orden",
    "Fecha de entrega", "Número de factura", "Valor de la factura", "Descripción de la factura",
    "Valor facturas", "Estado", "Fecha de creación", "Creado por", "Última actualización",
    "Actualizado por"
  ].freeze

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
    materials = sorted_materials(filtered_materials(Material.all.includes(:cost_center, :provider, :user, :last_user_edited, :material_invoices)))

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

  # La misma consulta que la tabla (get_materials), sin paginar: el frontend
  # manda los mismos parametros con que cargo la tabla.
  def download_file
    materials = sorted_materials(filtered_materials(
      Material.includes(:cost_center, :provider, :user, :last_user_edited, :material_invoices)
    ))

    respond_to do |format|
      format.xls do
        filas = materials.flat_map { |material| filas_excel_material(material) }
        send_data(xls_libro(ENCABEZADOS_EXCEL, filas, anchos: { "Descripción" => 60 }),
                  :filename => "Materiales.xls", :disposition => "inline")
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

  # Los filtros de la tabla. Los comparten la tabla (get_materials) y el Excel
  # (download_file) para que el archivo traiga lo mismo que se ve en pantalla.
  # Antes el Excel usaba Material.search, que reventaba con `downcase` de nil
  # cuando el frontend no mandaba un filtro vacio (3-nov-2026).
  def filtered_materials(materials)
    if params[:search].present?
      term = "%#{params[:search].downcase}%"
      materials = materials.joins(:cost_center, :provider).where(
        "LOWER(materials.description) LIKE ? OR LOWER(materials.sales_number) LIKE ? OR LOWER(providers.name) LIKE ? OR LOWER(cost_centers.code) LIKE ?",
        term, term, term, term
      )
    end

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

    materials
  end

  def sorted_materials(materials)
    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      materials.order(params[:sort] => direction)
    else
      materials.order(created_at: :desc)
    end
  end

  def filas_excel_material(m)
    inicio = [m.provider&.name, m.cost_center&.code, m.sales_number]
    final = [m.sales_state, xls_fecha_local(m.created_at), m.user&.names,
             xls_fecha_local(m.updated_at), m.last_user_edited&.names]
    facturas = m.material_invoices.sort_by { |f| [f.created_at.to_f, f.id] }
    total = facturas.sum { |f| f.value.to_f }

    return [inicio + [m.amount, m.description, m.sales_date, m.delivery_date, "", "", "", total] + final] if facturas.empty?

    facturas.each_with_index.map do |f, k|
      inicio + [k.zero? ? m.amount : 0, m.description, m.sales_date, m.delivery_date,
                f.number, f.value, f.observation, k.zero? ? total : 0] + final
    end
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

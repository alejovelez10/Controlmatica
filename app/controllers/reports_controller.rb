class ReportsController < ApplicationController
  before_action :set_report, only: [:show, :edit, :update, :destroy]
  before_action :authenticate_user!

  include ApplicationHelper
  include ActionView::Helpers::NumberHelper
  include ReportsHelper

  SORTABLE_COLUMNS = %w[code_report report_date working_time work_description viatic_value total_value].freeze

  # GET /reports
  # GET /reports.json
  def index
    mod = ModuleControl.find_by_name("Reportes de servicios")
    permisos = current_user.rol.accion_modules.where(module_control_id: mod.id).pluck(:name)
    is_admin = current_user.rol.name == "Administrador"

    @estados = {
      create: is_admin || permisos.include?("Crear"),
      edit: is_admin || permisos.include?("Editar"),
      edit_all: is_admin || permisos.include?("Editar todos"),
      delete: is_admin || permisos.include?("Eliminar"),
      responsible: is_admin || permisos.include?("Ver Responsables"),
      download_file: is_admin || permisos.include?("Descargar excel"),
      viatics: is_admin || permisos.include?("Ingresar viaticos"),
    }
  end

  # GET /reports/1
  # GET /reports/1.json
  def show
  end

  # GET /reports/new
  def new
    @report = Report.new
  end

  def get_reports
    report_mod = ModuleControl.find_by_name("Reportes de servicios")
    ver_todos = current_user.rol.accion_modules.where(module_control_id: report_mod.id).where(name: "Ver todos").exists?
    can_see_all = current_user.rol.name == "Administrador" || ver_todos

    reports = can_see_all ? Report.all : Report.where(report_execute_id: current_user.id)
    reports = reports.includes(:contact, :customer, :user, :report_execute, :last_user_edited, cost_center: :customer)

    if params[:search].present?
      term = "%#{params[:search].downcase}%"
      reports = reports.joins(:cost_center).where(
        "LOWER(reports.work_description) LIKE ? OR LOWER(reports.code_report) LIKE ? OR LOWER(cost_centers.code) LIKE ?", term, term, term
      )
    end

    reports = apply_report_filters(reports)

    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      reports = reports.order(params[:sort] => direction)
    else
      reports = reports.order(report_date: :desc)
    end

    page = (params[:page] || 1).to_i
    per_page = [(params[:per_page] || 50).to_i, 100].min
    total = reports.except(:includes).count
    paginated = reports.offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: get_reports_items(paginated),
      meta: { total: total, page: page, per_page: per_page, total_pages: (total.to_f / per_page).ceil }
    }
  end

  def controlmatica
  end

  def get_informes
    if !params[:customer_id].blank? || !params[:execution_state].blank? || !params[:invoiced_state].blank? || !params[:cost_center_id].blank? || !params[:service_type].blank? || !params[:date_desde].blank? || !params[:date_hasta].blank?
      cost_center = CostCenter.all.searchInfo(params[:customer_id], params[:execution_state], params[:invoiced_state], params[:cost_center_id], params[:service_type], params[:date_desde], params[:date_hasta], params[:cliente_incluido], params[:centro_incluido])

      materials = Material.joins(:cost_center).where("cost_centers.id" => cost_center.ids)
      contractors = Contractor.joins(:cost_center).where("cost_centers.id" => cost_center.ids)
      reports = Report.joins(:cost_center).where("cost_centers.id" => cost_center.ids)
      facturas = CustomerInvoice.joins(:cost_center).where("cost_centers.id" => cost_center.ids)
    else
      cost_center = CostCenter.all
      materials = Material.all
      contractors = Contractor.all
      reports = Report.all
      facturas = CustomerInvoice.all
    end

    current_year = Date.today.year

    # COST CENTER POR MES - una sola query con GROUP BY
    cc_monthly = cost_center
      .where("EXTRACT(YEAR FROM start_date) = ?", current_year)
      .group("EXTRACT(MONTH FROM start_date)")
      .sum(:quotation_value)
    months_lleno = (1..12).map { |m| cc_monthly[m.to_f]&.to_f || 0.0 }

    # MATERIALES POR MES - una sola query con GROUP BY
    mat_monthly = materials
      .where("EXTRACT(YEAR FROM sales_date) = ?", current_year)
      .group("EXTRACT(MONTH FROM sales_date)")
      .sum(:amount)
    months_lleno_mat = (1..12).map { |m| mat_monthly[m.to_f]&.to_f || 0.0 }

    # TABLERISTAS POR MES - una sola query con GROUP BY
    cont_monthly = contractors
      .where("EXTRACT(YEAR FROM sales_date) = ?", current_year)
      .group("EXTRACT(MONTH FROM sales_date)")
      .sum(:ammount)
    months_lleno_cont = (1..12).map { |m| cont_monthly[m.to_f]&.to_f || 0.0 }

    # REPORTES POR MES - una sola query con GROUP BY y múltiples SUM
    rep_monthly = reports
      .where("EXTRACT(YEAR FROM report_date) = ?", current_year)
      .group("EXTRACT(MONTH FROM report_date)")
      .select("EXTRACT(MONTH FROM report_date) as month, SUM(COALESCE(viatic_value, 0) + COALESCE(working_value, 0) + COALESCE(value_displacement_hours, 0)) as total")
    rep_monthly_hash = rep_monthly.each_with_object({}) { |r, h| h[r.month.to_i] = r.total.to_f }
    months_lleno_rep = (1..12).map { |m| rep_monthly_hash[m] || 0.0 }

    # VALORES POR AÑO - reutilizar los datos ya obtenidos
    cont_total = months_lleno_cont.sum
    mat_total = months_lleno_mat.sum
    report_total = months_lleno_rep.sum

    totals_all = [["x", "datos"], ["Ingenieria", report_total.round(0)], ["Tablerista", cont_total.round(0)], ["Equipos", mat_total.round(0)]]

    facturas_total = facturas.where("EXTRACT(YEAR FROM invoice_date) = ?", current_year).sum(:invoice_value)
    gastos_totales = cont_total + mat_total + report_total
    ventas_totales = months_lleno.sum  # Reutilizar datos ya calculados

    factura_gastos = [["", "x", { role: "annotation", type: "string" }, "datos", { role: "annotation", type: "string" }], ["FACTURACION VS GASTOS", facturas_total, number_to_currency(facturas_total, precision: 0), gastos_totales, number_to_currency(gastos_totales, precision: 0)]]

    factura_venta = [["", "x", { role: "annotation", type: "string" }, "datos", { role: "annotation", type: "string" }], ["FACTURACION VS VENTAS", facturas_total, number_to_currency(facturas_total, precision: 0), ventas_totales, number_to_currency(ventas_totales, precision: 0)]]

    venta_gastos = [["", "x", { role: "annotation", type: "string" }, "datos", { role: "annotation", type: "string" }], ["VENTAS VS GASTOS", ventas_totales, number_to_currency(ventas_totales, precision: 0), gastos_totales, number_to_currency(gastos_totales, precision: 0)]]

    # ENTRADAS POR CENTRO DE COSTOS - una sola query con múltiples SUM
    cc_entradas = cost_center
      .where("EXTRACT(YEAR FROM start_date) = ?", current_year)
      .select("SUM(COALESCE(engineering_value, 0) + COALESCE(viatic_value, 0) + COALESCE(offset_value, 0)) as ingenieria, SUM(COALESCE(work_force_contractor, 0)) as contratista, SUM(COALESCE(materials_value, 0)) as materiales")
      .take
    ingenieria_entradas = cc_entradas&.ingenieria.to_f || 0.0
    contratista_entradas = cc_entradas&.contratista.to_f || 0.0
    materials_entradas = cc_entradas&.materiales.to_f || 0.0

    totals_all_entradas = [["x", "datos"], ["Ingenieria", ingenieria_entradas.round(0)], ["Tablerista", contratista_entradas.round(0)], ["Equipos", materials_entradas.round(0)]]

    ingenieria_comparativa = [["", "Cotizado", { role: "annotation", type: "string" }, "Gasto", { role: "annotation", type: "string" }], ["", ingenieria_entradas.round(0), number_to_currency(ingenieria_entradas, precision: 0), report_total.round(0), number_to_currency(report_total, precision: 0)]]

    contratista_comparativa = [["", "Cotizado", { role: "annotation", type: "string" }, "Gasto", { role: "annotation", type: "string" }], ["", contratista_entradas.round(0), number_to_currency(contratista_entradas, precision: 0), cont_total.round(0), number_to_currency(cont_total, precision: 0)]]

    materiales_comparativa = [["", "Cotizado", { role: "annotation", type: "string" }, "Gasto", { role: "annotation", type: "string" }], ["", materials_entradas.round(0), number_to_currency(materials_entradas, precision: 0), mat_total.round(0), number_to_currency(mat_total, precision: 0)]]

    render :json => {
      dataCostCenter: months_lleno,
      dataMaterials: months_lleno_mat,
      dataTableristas: months_lleno_cont,
      dataReports: months_lleno_rep,
      gastosTotales: totals_all,
      facturaGastos: factura_gastos,
      facturaVentas: factura_venta,
      ventaGastos: venta_gastos,
      entradasTotales: totals_all_entradas,
      ingenieriaComparativa: ingenieria_comparativa,
      contratistaComparativa: contratista_comparativa,
      materialesComparativa: materiales_comparativa,

    }
  end

  def download_file
    report = ModuleControl.find_by_name("Reportes de servicios")
    estado = current_user.rol.accion_modules.where(module_control_id: report.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)

    if validate
      if params[:ids] != "todos"
        report_show = Report.search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate], params[:cost_center_id], params[:customer_id], params[:date_desde], params[:date_hasta], params[:code_report]).order(report_date: :desc)
      else
        report_show = Report.all
      end
    else
      if params[:ids] != "todos"
        report_show = Report.where(user_id: current_user.id).search(params[:work_description], params[:report_execute_id], params[:date_ejecution], params[:report_sate], params[:cost_center_id], params[:customer_id], params[:date_desde], params[:date_hasta], params[:code_report]).order(report_date: :desc)
      else
        report_show = Report.where(user_id: current_user.id)
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

        report_show.each.with_index(1) do |task, i|
          position = sheet.row(i)

          sheet.row(1).default_format = rows_format
          position[0] = task.code_report
          position[1] = task.cost_center.present? ? task.cost_center.code : ""
          position[2] = task.report_date
          position[3] = task.report_execute.present? ? task.report_execute.names : ""
          position[4] = task.working_time
          position[5] = task.work_description
          position[6] = task.viatic_value
          position[7] = task.viatic_description
          position[8] = task.total_value
          position[9] = task.report_sate ? "Aprobado" : "Sin Aprobar"

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

        position[0] = "Codigo"
        position[1] = "Centro de Costos"
        position[2] = "Fecha de Ejecucion"
        position[3] = "Responsable Ejecucion"
        position[4] = "Horas Laboradas"
        position[5] = "Descripcion del Trabajo"
        position[6] = "Valor de los Viaticos"
        position[7] = "Descripcion de Viaticos"
        position[8] = "Valor del Reporte"
        position[9] = "Estado"

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

        send_data(temp_file.string, :filename => "Reportes_de_servicios.xls", :disposition => "inline")
      end
    end
  end

  # GET /reports/1/edit
  def edit
    @centro = CostCenter.where(customer_id: @report.customer.id)
    @contacts_user = @report.customer.contacts
  end

  # POST /reports
  # POST /reports.json

  def create
    valor1 = report_params_create["viatic_value"].gsub("$", "").gsub(",", "")
    params["viatic_value"] = valor1

    @report = Report.create(report_params_create)

    if @report.save
      recalculate_cost_center(@report.cost_center_id, "reportes")

      render :json => {
               message: "¡El Registro fue creado con exito!",
               register: get_report_item(@report),
               type: "success",
             }
    else
      render :json => {
               message: "¡El Registro no fue creado!",
               type: "error",
               message_error: @report.errors.full_messages,
             }
    end
  end

  # PATCH/PUT /reports/1
  # PATCH/PUT /reports/1.json

  def update
    if report_params_update["viatic_value"].class.to_s != "Integer"
      valor1 = report_params_update["viatic_value"].gsub("$", "").gsub(",", "")
      params["viatic_value"] = valor1
    end

    const_center_last = @report.cost_center_id
    if @report.update(report_params_update.merge!(update_user: current_user.id))
      recalculate_cost_center(@report.cost_center_id, "reportes")
      recalculate_cost_center(const_center_last, "reportes")
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        register: get_report_item(@report),
        type: "success",
      }
    else
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @report.errors.full_messages,
      }
    end
  end

  # DELETE /reports/1
  # DELETE /reports/1.json
  def destroy
    if @report.destroy
      render :json => @report
    else
      render :json => @report.errors.full_messages
    end
  end

  def get_contact
    contact = Contact.find(params[:id])
    render json: contact
  end

  private

  # Use callbacks to share common setup or constraints between actions.
  def set_report
    @report = Report.find(params[:id])
  end

  # Never trust parameters from the scary internet, only allow the white list through.
  def report_params_create
    defaults = { user_id: current_user.id }
    params.permit(:report_date, :user_id, :working_time, :work_description, :viatic_value, :viatic_description, :total_value, :cost_center_id, :report_code, :report_execute_id, :working_value, :contact_id, :customer_name, :contact_name, :contact_email, :contact_phone, :contact_position, :customer_id, :count, :displacement_hours, :value_displacement_hours, :update_user).reverse_merge(defaults)
  end

  def apply_report_filters(scope)
    scope = scope.where("work_description ILIKE ?", "%#{params[:work_description]}%") if params[:work_description].present?
    scope = scope.where(report_execute_id: params[:report_execute_id]) if params[:report_execute_id].present?
    scope = scope.where("DATE(report_date) = ?", params[:date_ejecution]) if params[:date_ejecution].present?
    scope = scope.where(report_sate: params[:report_sate]) if params[:report_sate].present?
    scope = scope.where(cost_center_id: params[:cost_center_id]) if params[:cost_center_id].present?
    scope = scope.where(customer_id: params[:customer_id]) if params[:customer_id].present?
    scope = scope.where("report_date >= ?", params[:date_desde]) if params[:date_desde].present?
    scope = scope.where("report_date <= ?", params[:date_hasta]) if params[:date_hasta].present?
    scope = scope.where("code_report ILIKE ?", "%#{params[:code_report]}%") if params[:code_report].present?
    scope
  end

  def report_params_update
    params.permit(:report_date, :working_time, :work_description, :viatic_value, :viatic_description, :total_value, :cost_center_id, :report_code, :report_execute_id, :working_value, :contact_id, :customer_name, :contact_name, :contact_email, :contact_phone, :contact_position, :customer_id, :count, :displacement_hours, :value_displacement_hours, :update_user)
  end
end

#  displacement_hours       :float
#  value_displacement_hours :float

class HomeController < ApplicationController
  before_action :authenticate_user!

  def index
  end

  def dashboard
  end

  def dashboard_ing
  end

  def get_dashboard_ing
    user = User.find(params[:user_id])
    real_year = params[:id].to_i
    count = params[:count].to_i

    year = Date.today.year
    month = Date.today.month
    max_month = (real_year == year) ? month : 12
    tablerista = user.rol.name == "TABLERISTA"

    # Obtener los top cost_centers
    if !tablerista
      cc_counts = Report
        .where(report_execute_id: user.id)
        .where("extract(year from report_date) = ?", real_year)
        .group(:cost_center_id)
        .count
    else
      cc_counts = Contractor
        .where(user_execute_id: user.id)
        .where("extract(year from sales_date) = ?", real_year)
        .group(:cost_center_id)
        .count
    end

    top_cc_ids = cc_counts.sort_by { |_k, v| -v }.first(count).map(&:first)
    return render json: { categories: [], series: [] } if top_cc_ids.empty?

    # Cargar todos los cost_centers de una vez
    cost_centers = CostCenter.where(id: top_cc_ids).index_by(&:id)

    # Obtener datos mensuales agrupados por cost_center y mes en UNA query
    if !tablerista
      monthly_data = Report
        .where(report_execute_id: user.id, cost_center_id: top_cc_ids)
        .where("extract(year from report_date) = ?", real_year)
        .group(:cost_center_id, "extract(month from report_date)")
        .sum(:working_time)
    else
      monthly_data = Contractor
        .where(user_execute_id: user.id, cost_center_id: top_cc_ids)
        .where("extract(year from sales_date) = ?", real_year)
        .group(:cost_center_id, "extract(month from sales_date)")
        .sum(:hours)
    end

    month_convert = (1..max_month).map { |m| get_month(m) }
    series = top_cc_ids.map do |cc_id|
      cc = cost_centers[cc_id]
      months = (1..max_month).map { |m| monthly_data[[cc_id, m.to_f]] || 0 }
      { name: cc&.code || "N/A", data: months }
    end

    render json: { categories: month_convert, series: series }
  end

  def get_dashboard_two_ing
    user = User.find(params[:user_id])
    real_year = params[:id].to_i
    alert = Alert.first
    year = Date.today.year
    month = Date.today.month

    max_month = (real_year == year) ? month : 12
    tablerista = user.rol.name == "TABLERISTA"

    # Una sola query con GROUP BY en lugar de 12 queries
    if !tablerista
      monthly_data = Report
        .where(report_execute_id: user.id)
        .where("extract(year from report_date) = ?", real_year)
        .group("extract(month from report_date)")
        .sum(:working_time)
    else
      monthly_data = Contractor
        .where(user_execute_id: user.id)
        .where("extract(year from sales_date) = ?", real_year)
        .group("extract(month from sales_date)")
        .sum(:hours)
    end

    series = []
    colors = []
    colors_lables = []
    month_convert = []

    (1..max_month).each do |val|
      hours = monthly_data[val.to_f] || 0
      month_convert << get_month(val)
      colors << if hours <= alert.alert_min
                  "#d26666"
                elsif hours < alert.alert_med
                  "#d4b21e"
                else
                  "#24bc6b"
                end
      colors_lables << "gray"
      series << hours
    end

    render json: {
      categories: month_convert,
      series: series,
      colors: colors,
      colors_lables: colors_lables,
    }
  end

  def get_dashboard_three_ing
    user = User.find(params[:user_id])
    real_year = params[:ye].to_i
    real_month = params[:mo].to_i
    tablerista = user.rol.name == "TABLERISTA"

    # Una sola query para obtener horas por cost_center del mes específico
    if !tablerista
      cc_hours = Report
        .where(report_execute_id: user.id)
        .where("extract(year from report_date) = ? AND extract(month from report_date) = ?", real_year, real_month)
        .group(:cost_center_id)
        .sum(:working_time)
    else
      cc_hours = Contractor
        .where(user_execute_id: user.id)
        .where("extract(year from sales_date) = ? AND extract(month from sales_date) = ?", real_year, real_month)
        .group(:cost_center_id)
        .sum(:hours)
    end

    # Filtrar solo los que tienen horas > 0 y cargar cost_centers de una vez
    cc_hours_filtered = cc_hours.select { |_k, v| v > 0 }
    cost_centers = CostCenter.where(id: cc_hours_filtered.keys).index_by(&:id)

    series = []
    cost_centers_array = []
    colors = []
    colors_lables = []

    cc_hours_filtered.each do |cc_id, hours|
      cc = cost_centers[cc_id]
      next unless cc
      series << hours
      cost_centers_array << cc.code
      colors << "#3fb0f0"
      colors_lables << "gray"
    end

    render json: {
      categories: cost_centers_array,
      series: series,
      colors: colors,
      colors_lables: colors_lables,
    }
  end

  def get_dashboard_four_ing
    user = User.find(params[:user_id])
    count = params[:id].to_i
    alert = Alert.first
    tablerista = user.rol.name == "TABLERISTA"

    # Calcular el rango de fechas
    start_date = Date.today - count + 1
    end_date = Date.today

    # Una sola query con GROUP BY en lugar de N queries
    if !tablerista
      daily_data = Report
        .where(report_execute_id: user.id)
        .where(report_date: start_date..end_date)
        .group(:report_date)
        .sum(:working_time)
    else
      daily_data = Contractor
        .where(user_execute_id: user.id)
        .where(sales_date: start_date..end_date)
        .group(:sales_date)
        .sum(:hours)
    end

    series = []
    colors = []
    colors_lables = []
    categories = []

    (start_date..end_date).each do |date|
      hours = daily_data[date] || 0
      categories << date
      colors << if hours <= alert.alert_hour_min
                  "#d26666"
                elsif hours < alert.alert_hour_med
                  "#d4b21e"
                else
                  "#24bc6b"
                end
      colors_lables << "gray"
      series << hours
    end

    render json: {
      categories: categories,
      series: series,
      colors: colors,
      colors_lables: colors_lables,
    }
  end

  def get_dashboard_five_ing
    user = User.find(params[:user_id])
    real_year = params[:id].to_i

    value_hour = Parameterization.find_by_name("HORA PROMEDIO COTIZADA").money_value
    p_alert = Parameterization.find_by_name("PORCENTAJE DE COMISION").money_value.to_f / 100
    multiplier = value_hour * p_alert

    cost_center_ids = CostCenter.where(customer_id: [4, 1, 15]).ids

    # Una sola query con GROUP BY trimestre en lugar de 4 queries
    quarterly_data = Report
      .where(report_execute_id: user.id)
      .where("extract(year from report_date) = ?", real_year)
      .where.not(cost_center_id: cost_center_ids)
      .group("EXTRACT(QUARTER FROM report_date)")
      .sum(:working_time)

    series = [
      { name: "T1", data: [(quarterly_data[1.0] || 0) * multiplier] },
      { name: "T2", data: [(quarterly_data[2.0] || 0) * multiplier] },
      { name: "T3", data: [(quarterly_data[3.0] || 0) * multiplier] },
      { name: "T4", data: [(quarterly_data[4.0] || 0) * multiplier] },
    ]

    render json: {
      categories: [real_year.to_s],
      series: series,
    }
  end

  def users_new
  end

  def get_roles
    is_admin = current_user.rol.name == "Administrador"
    return render json: { materials: true, sales_orders: true } if is_admin

    # Una sola query para obtener los módulos y permisos
    module_ids = ModuleControl.where(name: ["Materiales", "Ordenes de Compra"]).pluck(:name, :id).to_h
    permissions = current_user.rol.accion_modules
      .where(module_control_id: module_ids.values, name: "Ingreso al modulo")
      .pluck(:module_control_id)
      .to_set

    render json: {
      materials: permissions.include?(module_ids["Materiales"]),
      sales_orders: permissions.include?(module_ids["Ordenes de Compra"]),
    }
  end

  def index_user
    is_admin = current_user.rol.name == "Administrador"

    if is_admin
      @estados = { create: true, edit: true, delete: true, download_file: true }
    else
      users_module = ModuleControl.find_by_name("Usuarios")
      # Una sola query para obtener todos los permisos del módulo
      permissions = current_user.rol.accion_modules
        .where(module_control_id: users_module.id)
        .where(name: ["Crear", "Editar", "Eliminar", "Descargar excel"])
        .pluck(:name)
        .to_set

      @estados = {
        create: permissions.include?("Crear"),
        edit: permissions.include?("Editar"),
        delete: permissions.include?("Eliminar"),
        download_file: permissions.include?("Descargar excel"),
      }
    end

    @user = User.all
  end

  def download_file
    users = User.includes(:rol).all
    respond_to do |format|
      format.xls do
        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet

        rows_format = Spreadsheet::Format.new color: :black,
                                              weight: :normal,
                                              size: 13,
                                              align: :left

        users.each.with_index(1) do |task, i|
          position = sheet.row(i)

          sheet.row(1).default_format = rows_format
          position[0] = task.names
          position[1] = task.email
          position[2] = task.rol.present? ? task.rol.name : ""
          position[3] = task.document_type
          position[4] = task.number_document

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

        position[0] = "Nombre"
        position[1] = "Email"
        position[2] = "Rol"
        position[3] = "Tipo de documento"
        position[4] = "Documento"

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

        send_data(temp_file.string, :filename => "Usuarios.xls", :disposition => "inline")
      end
    end
  end

  private

  def get_month(month)
    case month
    when 1
      "Ene"
    when 2
      "Feb"
    when 3
      "Mar"
    when 4
      "Abr"
    when 5
      "May"
    when 6
      "Jun"
    when 7
      "Jul"
    when 8
      "Ago"
    when 9
      "Sep"
    when 10
      "Oct"
    when 11
      "Nov"
    when 12
      "Dic"
    end
  end
end

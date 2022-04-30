class HomeController < ApplicationController
  before_action :authenticate_user!

  def index
  end

  def dashboard
  end

  def dashboard_ing
  end

  def get_dashboard_ing
    real_year = params[:id].to_s

    year = Date.today.year
    month = Date.today.month
    day = Date.today.day

    get_months = []
    if real_year == year.to_s
      date_month = month
      (1..date_month).each do |mh|
        get_months << mh
      end
    else
      get_months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    end

    month_convert = []

    user = current_user

    cost_center = Report.where(report_execute_id: current_user.id).where("extract(year  from report_date) = ?", real_year.to_i).select(:cost_center_id).group(:cost_center_id).count

    series = []
    cost_center.each do |key, value|
      cc = CostCenter.find(key)
      data = Report.where(report_execute_id: current_user.id, cost_center_id: cc.id).where("extract(year  from report_date) = ?", real_year.to_i)

      months = []
      get_months.each do |val|
        month_convert << get_month(val)
        months << data.where("extract(month from report_date) = ?", val).sum(:working_time)
      end

      series << { name: cc.code, data: months }
    end

    render :json => {
      categories: month_convert,
      series: series,
    }
  end

  def get_dashboard_two_ing
    real_year = params[:id].to_s

    year = Date.today.year
    month = Date.today.month
    day = Date.today.day

    get_months = []
    if real_year == year.to_s
      date_month = month
      (1..date_month).each do |mh|
        get_months << mh
      end
    else
      get_months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    end

    user = current_user

    series = []
    colors = []
    colors_lables = []

    data = Report.where(report_execute_id: current_user.id).where("extract(year  from report_date) = ?", real_year.to_i)
    month_convert = []
    months = 0
    get_months.each do |val|
      months = data.where("extract(month from report_date) = ?", val).sum(:working_time)
      month_convert << get_month(val)
      if month <= 10
        colors << "#d26666"
      elsif month > 10 && month < 20
        colors << "#d4b21e"
      else
        colors << "#24bc6b"
      end
      colors_lables << "gray"
      series << months
    end

    render :json => {
             categories: month_convert,
             series: series,
             colors: colors,
             colors_lables: colors_lables,
           }
  end

  def get_dashboard_three_ing
    real_year = params[:ye].to_s
    real_month = params[:mo].to_s

    year = Date.today.year
    month = Date.today.month
    day = Date.today.day

    cost_center = Report.where(report_execute_id: current_user.id).where("extract(year  from report_date) = ?", real_year.to_i).select(:cost_center_id).group(:cost_center_id).count
    series = []
    cost_centers_array = []
    colors_lables = []
    months = 0
    colors = []
    cost_center.each do |key, value|
      cc = CostCenter.find(key)
      data = Report.where(report_execute_id: current_user.id, cost_center_id: cc.id).where("extract(year  from report_date) = ?", real_year.to_i)
      if data.where("extract(month from report_date) = ?", real_month).sum(:working_time) > 0
        series << data.where("extract(month from report_date) = ?", real_month).sum(:working_time)
        cost_centers_array << cc.code
        colors << "#3fb0f0"
        colors_lables << "gray"
      end
    end

    render :json => {
             categories: cost_centers_array,
             series: series,
             colors: colors,
             colors_lables: colors_lables,
           }
  end

  def get_dashboard_four_ing
    count = params[:id].to_i

    year = Date.today.year
    month = Date.today.month
    day = Date.today.day
    user = current_user

    series = []
    colors = []
    colors_lables = []
    categories = []
    data = Report.where(report_execute_id: current_user.id).where("extract(year  from report_date) = ?", year.to_i)

    months = 0

    (1..count).each do |val|
      months = data.where(report_date: Date.today - count + val.day).sum(:working_time)
      categories << Date.today - count + val.day
      if month <= 10
        colors << "#d26666"
      elsif month > 10 && month < 20
        colors << "#d4b21e"
      else
        colors << "#24bc6b"
      end
      colors_lables << "gray"
      series << months
      categories
    end

    render :json => {
             categories: categories,
             series: series,
             colors: colors,
             colors_lables: colors_lables,
           }
  end

  def users_new
  end

  def get_roles
    materials = ModuleControl.find_by_name("Materiales")
    sales_orders = ModuleControl.find_by_name("Ordenes de Compra")

    ordenes = current_user.rol.accion_modules.where(module_control_id: sales_orders.id).where(name: "Ingreso al modulo").exists?
    materiales = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Ingreso al modulo").exists?

    render :json => {
      materials: (current_user.rol.name == "Administrador" ? true : materiales),
      sales_orders: (current_user.rol.name == "Administrador" ? true : ordenes),
    }
  end

  def index_user
    users = ModuleControl.find_by_name("Usuarios")

    create = current_user.rol.accion_modules.where(module_control_id: users.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: users.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: users.id).where(name: "Eliminar").exists?
    download_file = current_user.rol.accion_modules.where(module_control_id: users.id).where(name: "Descargar excel").exists?

    @estados = {
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      download_file: (current_user.rol.name == "Administrador" ? true : download_file),
    }

    @user = User.all
  end

  def download_file
    users = User.all
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

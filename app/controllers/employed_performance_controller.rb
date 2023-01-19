class EmployedPerformanceController < ApplicationController
  before_action :authenticate_user!

  def show
    informe = ModuleControl.find_by_name("Informe de rendimiento")
    estado = current_user.rol.accion_modules.where(module_control_id: informe.id).where(name: "Ver Responsables").exists?
    @validate = (current_user.rol.name == "Administrador" ? true : estado)
  end

  def info_pdf
    @user = User.find(params[:user_id])
    @fecha_desde = params[:fecha_desde]
    @fecha_hasta = params[:fecha_hasta]
    @reports = Report.where(report_execute: @user).where("report_date >= ?", @fecha_desde).where("report_date <= ?", @fecha_hasta).order(report_date: :asc)

    respond_to do |format|
      #format.html
      format.pdf do
        render :pdf => "formatos1",
               :template => "employed_performance/show_pdf.pdf.erb",
               :layout => "pdf.html.erb",
               :show_as_html => params[:debug].present?
      end
    end
  end

  def info_pdf_new
    array = []
    user = User.find(params[:user_id])
    fecha_desde = params[:fecha_desde]
    fecha_hasta = params[:fecha_hasta]
    reports = Report.where(report_execute: user).where("report_date >= ?", fecha_desde).where("report_date <= ?", fecha_hasta).order(report_date: :asc)

    reports.each do |report|
      array << [report.report_date.strftime("%d-%m-%Y"), report.working_time + report.displacement_hours, report.cost_center.code, report.customer.name, report.work_description, report.cost_center.description]
    end

    headers = ["FECHA", "HORAS", "CENTRO DE COSTO", "CLIENTE", "DESCRIPCION ACTIVIDAD", "DESCRIPCION CENTRO DE COSTO"]

    data = [
      ["", { :content => "REPORTE DE EFICIENCIA", :colspan => 2, :align => :center }, { :content => "", :align => :center }],
    ]

    dataTable1 = [
      [{ :content => "Empleado: #{user.names}", :colspan => 2 }],
      ["Fecha Desde: #{fecha_desde}", "Fecha hasta: #{fecha_hasta}"],
    ]

    dataTable2 = [["Total: #{reports.sum(:working_time)}"]]

    content = "\n"

    respond_to do |format|
      format.pdf do
        pdf = Prawn::Document.new

        pdf.table(data, :width => 540, cell_style: { :padding => [20, 10, 20, 10] }) do |table|
          table.rows(1..3).width = 72
        end

        pdf.text content

        pdf.table(dataTable1, :width => 540) do |table|
        end

        pdf.text content

        pdf.table([headers] + array, :header => true, :width => 540, cell_style: { align: :center, :top_margin => 100, :size => 7 }) do |table|
          table.row(0).background_color = "2a3f54"
          table.row(0).size = 7
          table.row(0).text_color = "FFFFFF"
          table.rows(1..3).width = 72
        end

        pdf.text content

        pdf.table(dataTable2, :width => 540) do |table|
        end

        send_data pdf.render,
          filename: "export.pdf",
          type: "application/pdf",
          disposition: "inline"
      end
    end
  end
end

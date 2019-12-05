class EmployedPerformanceController < ApplicationController
    before_action :authenticate_user!

  def show
    informe = ModuleControl.find_by_name("Informe de rendimiento")
    estado = current_user.rol.accion_modules.where(module_control_id: informe.id).where(name: "Ingreso al modulo").exists?
    @validate = (current_user.rol.name == "Administrador" ? true : estado)
  end

  def info_pdf
  	@user = User.find(params[:user_id])
  	@fecha_desde = params[:fecha_desde]
  	@fecha_hasta = params[:fecha_hasta]
  	@reports = Report.where(report_execute: @user).where("report_date >= ?" ,@fecha_desde).where("report_date <= ?" , @fecha_hasta).order(report_date: :asc)



  	respond_to do |format|
        #format.html
        format.pdf do
          render :pdf => "formatos1",
          :template => 'employed_performance/show_pdf.pdf.erb',
          :layout => 'pdf.html.erb',
          :show_as_html => params[:debug].present?
      end
    end 

  end	


end

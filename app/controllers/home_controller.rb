class HomeController < ApplicationController
	before_action :authenticate_user!
  def index
  end

  def dashboard
  	
  end

  def dashboard_ing


  end


  def get_dashboard_ing
    user = current_user
    
    time = [["Year", "Sales", "Expenses", "Profit"]]
    [1,2,3,4].each do |val|
      array_ = []
      array_ << Date.today - val.days
      array_ <<  Report.where(report_execute_id: user.id).where(report_date: Date.today - val.days).sum(:working_time)
      array_ <<  Report.where(report_execute_id: user.id).where(report_date: Date.today - val.days).sum(:working_time)
      array_ <<  Report.where(report_execute_id: user.id).where(report_date: Date.today - val.days).sum(:working_time)
      time << array_


    end

  
    render :json => {      
      data: time
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
      sales_orders: (current_user.rol.name == "Administrador" ? true : ordenes)
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
      download_file: (current_user.rol.name == "Administrador" ? true : download_file)
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
        
        send_data(temp_file.string, :filename => "Usuarios.xls", :disposition => 'inline')
        
        end  
    end

  end
  
end

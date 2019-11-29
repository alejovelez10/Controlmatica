class HomeController < ApplicationController
	before_action :authenticate_user!
  def index
  end

  def dashboard
  	
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

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete)
    }

  	@user = User.all
  end
  
end

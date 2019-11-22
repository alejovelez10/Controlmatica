class HomeController < ApplicationController
	before_action :authenticate_user!
  def index
  end

  def dashboard
  	
  end


  def users_new
  	
  end

  def get_roles
    contractors = ModuleControl.find_by_name("Contratistas")
    materials = ModuleControl.find_by_name("Materiales")
    sales_orders = ModuleControl.find_by_name("Ordenes de Compra")

    contatistas = current_user.rol.accion_modules.where(module_control_id: contractors.id).where(name: "Ingreso al modulo").exists?
    ordenes = current_user.rol.accion_modules.where(module_control_id: sales_orders.id).where(name: "Ingreso al modulo").exists?
    materiales = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Ingreso al modulo").exists?

    render :json => {      
      contractors: (current_user.rol.name == "Administrador" ? true : contractors),
      materials: (current_user.rol.name == "Administrador" ? true : materials),
      sales_orders: (current_user.rol.name == "Administrador" ? true : ordenes)
    }
  end
  

  def index_user
  	@user = User.all
  end
  
end

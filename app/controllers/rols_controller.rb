class RolsController < ApplicationController
  before_action :set_module_control, only: [:destroy, :edit, :update, :show, :get_accion_modules]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

  def index
    roles = ModuleControl.find_by_name("Roles")

    create = current_user.rol.accion_modules.where(module_control_id: roles.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: roles.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: roles.id).where(name: "Eliminar").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete)
    }
  end
  

  def get_rols
    @rol = Rol.all.order(created_at: :asc)
    @rol =  @rol.to_json(:include => [:accion_modules => {:only =>[:id]}])
    @rol = JSON.parse(@rol)
    render :json => @rol
  end

  def create
  	@rol = Rol.create(module_params)
      if @rol.save
        render :json => @rol
      else
        render :json => @rol.errors
      end
  end

  def new
    
  end

  def show
    
  end
  

  def edit
    render :json => @rol
  end

  def update 
    if @rol.update(module_params)
      render :json => {
        message: "¡El Registro fue actualizado con exito!"
      }
    else 
      render :json => {
        message: "¡El Registro fue actualizado con exito!"
      }
    end
  end

  def destroy
  	  if @rol.destroy
        render :json => @rol
      else 
        render :json => @rol.errors
      end
  end

  private 

  def set_module_control
  	@rol = Rol.find(params[:id])
  end

  def module_params
    params.permit(:name, :description, :user_id, :accion_module_ids=>[])
  end
end

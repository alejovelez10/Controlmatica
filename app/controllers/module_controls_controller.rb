class ModuleControlsController < ApplicationController
    before_action :set_module_control, only: [:destroy, :edit, :update, :show, :get_accion_modules]
    before_action :authenticate_user!
    skip_before_action :verify_authenticity_token
  
    def index
      contractors = ModuleControl.find_by_name("Tableristas")

      create = current_user.rol.accion_modules.where(module_control_id: contractors.id).where(name: "Crear").exists?
      edit = current_user.rol.accion_modules.where(module_control_id: contractors.id).where(name: "Editar").exists?
      delete = current_user.rol.accion_modules.where(module_control_id: contractors.id).where(name: "Eliminar").exists?
  
      @estados = {      
        create: (current_user.rol.name == "Administrador" ? true : create),
        edit: (current_user.rol.name == "Administrador" ? true : edit),
        delete: (current_user.rol.name == "Administrador" ? true : delete),
        gestionar: (current_user.rol.name == "Administrador" ? true : true)
      }
    end
  
    def get_actions
      @modulo = ModuleControl.all
      render :json => @modulo, include: { :user => { :only => [:name, :email] }}
    end
  
  
    def get_accion_modules
        @accion_module = AccionModule.where(module_control_id: @modulo.id)
      render :json => @accion_module
    end
    
  
    def create
        @modulo = ModuleControl.create(module_params)
        if @modulo.save
          render :json => @modulo
        else
          render :json => @modulo.errors
        end
    end
  
    def new
      
    end
  
    def edit
      render :json => @modulo
    end
  
    def update 
      if @modulo.update(module_params)
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
          if @modulo.destroy
          render :json => @modulo
        else 
          render :json => @modulo.errors
        end
    end
  
    private 
  
    def set_module_control
        @modulo = ModuleControl.find(params[:id])
    end
  
    def module_params
      params.permit(:name, :description, :user_id)
    end
  end
  
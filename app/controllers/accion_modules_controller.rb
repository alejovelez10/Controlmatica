class AccionModulesController < ApplicationController
    before_action :set_action_module, only: [:destroy, :edit, :update, :show]
    skip_before_action :verify_authenticity_token  
    
    def index      
    end
  
    def get_accions
      @modules = ModuleControl.all
      @modules =  @modules.to_json(:include => [:accion_modules])
      @modules = JSON.parse(@modules)
      @accions = AccionModule.all
      render :json => [@modules,@accions]
    end
    
    def create
        @accion_module = AccionModule.create(action_module_params)
        if @accion_module.save
          render :json => {
            message: "¡El Registro fue creado con exito!",
            type: "success"
          }
        else
          render :json => {
            message: "¡El Registro no fue creado!",
            type: "error",
            message_error: @accion_module.errors.full_messages
          }
      end
        
    end
  
    def new
      
    end
  
    def show
      
    end
    
  
    def edit
      render :json => @accion_module
    end
  
    def update
      if @accion_module.update(action_module_params) 
        render :json => {
          message: "¡El Registro fue actualizado con exito!",
          type: "success"
        }
      else 
        render :json => {
          message: "¡El Registro no fue actualizado!",
          type: "error",
          message_error: @accion_module.errors.full_messages
        }
      end
    end
  
    def destroy
          if @accion_module.destroy
          render :json => @modulo
        else 
          render :json => @modulo.errors
        end
    end
  
    private 
  
    def set_action_module
        @accion_module = AccionModule.find(params[:id])
    end
  
    def action_module_params
      params.permit(:name, :description, :user_id, :module_control_id)
    end
  end
  
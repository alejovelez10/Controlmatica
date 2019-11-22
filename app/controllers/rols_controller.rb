class RolsController < ApplicationController
  before_action :set_module_control, only: [:destroy, :edit, :update, :show, :get_accion_modules]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

  def index

  end
  

  def get_rols
    @rol = Rol.all
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

class ContractorsController < ApplicationController
  before_action :set_contractor, only: [:destroy, :update]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

  def index
    contractors = ModuleControl.find_by_name("Contratistas")

    create = current_user.rol.accion_modules.where(module_control_id: contractors.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: contractors.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: contractors.id).where(name: "Eliminar").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete)
    }
  end

  def get_contractors
    if params[:user_execute_id] || params[:sales_date] || params[:cost_center_id]
      contractor = Contractor.search(params[:user_execute_id], params[:sales_date], params[:cost_center_id]).to_json( :include => { :cost_center => { :only =>[:code] }, :user_execute => { :only =>[:names] } })
    else
      contractor = Contractor.all.to_json( :include => { :cost_center => { :only =>[:code] }, :user_execute => { :only =>[:names] } })
    end
    
    contractor = JSON.parse(contractor)
    render :json => contractor
  end

  def create
    valor1 = contractor_params["ammount"].gsub('$','').gsub(',','')
    params["ammount"] = valor1

  	@contractor = Contractor.create(contractor_params)
      if @contractor.save
        render :json => {
          message: "¡El Registro fue creado con exito!",
          type: "success"
        }
      else
        render :json => {
          message: "¡El Registro no fue creado!",
          type: "error",
          message_error: @contractor.errors.full_messages
        }
    end
  	
  end

  def update
    if params["ammount"].present?
      if contractor_params["ammount"].class.to_s != "Integer"
        valor1 = contractor_params["ammount"].gsub('$','').gsub(',','')
        params["ammount"] = valor1
      end
    end

    if @contractor.update(contractor_params) 
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        type: "success"
      }
    else 
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @contractor.errors.full_messages
      }
    end
  end

  def destroy
    if @contractor.destroy
      render :json => @contractor
    else 
      render :json => @contractor.errors.full_messages
    end
  end


  def set_contractor
  	@contractor = Contractor.find(params[:id])
  end

  def contractor_params
    params.permit(:sales_date, :sales_number, :ammount, :cost_center_id, :user_id, :description, :hours, :user_execute_id)
  end
end
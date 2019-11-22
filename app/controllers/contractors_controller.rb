class ContractorsController < ApplicationController
  before_action :set_contractor, only: [:destroy, :update]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

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

    if contractor_params["ammount"].class.to_s != "Integer"
      valor1 = contractor_params["ammount"].gsub('$','').gsub(',','')
      params["ammount"] = valor1
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
    params.permit(:sales_date, :sales_number, :ammount, :cost_center_id, :user_id)
  end
end

class MaterialInvoicesController < ApplicationController
  before_action :set_material_invoice, only: [:destroy, :update]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

  def get_material_invoice
    material_invoice = MaterialInvoice.where(material_id: params[:id])
    render :json => material_invoice
  end

  def update_load
    
  end


  def create
    valor1 = material_invoice_params["value"].gsub('$','').gsub(',','')
    params["value"] = valor1

  	@material_invoice = MaterialInvoice.create(material_invoice_params)
      if @material_invoice.save
        render :json => {
          message: "¡El Registro fue creado con exito!",
          type: "success"
        }
      else
        render :json => {
          message: "¡El Registro no fue creado!",
          type: "error",
          message_error: @material_invoice.errors.full_messages
        }
    end
  	
  end

  def update
    if material_invoice_params["value"].class.to_s != "Integer" && material_invoice_params["value"].class.to_s != "Float" && material_invoice_params["value"].present?
      valor1 = material_invoice_params["value"].gsub('$','').gsub(',','')
      params["value"] = valor1
    end

    if @material_invoice.update(material_invoice_params) 
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        type: "success"
      }
    else 
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @material_invoice.errors.full_messages
      }
    end
  end

  def destroy
  	  if @material_invoice.destroy
        render :json => @material_invoice
      else 
        render :json => @material_invoice.errors.full_messages
      end
  end

  private 

  def set_material_invoice
  	@material_invoice = MaterialInvoice.find(params[:id])
  end

  def material_invoice_params
    params.permit(:material_id, :user_id, :number, :value, :observation, :file)
  end
end

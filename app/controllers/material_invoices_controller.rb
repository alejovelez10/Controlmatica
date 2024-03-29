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
          register: @material_invoice,
          type: "success"
        }

        Material.set_state(@material_invoice.material_id)
      else
        render :json => {
          message: "¡El Registro no fue creado!",
          type: "error",
          message_error: @material_invoice.errors.full_messages
        }
    end
  	
  end

  def update
    if material_invoice_update_params["value"].class.to_s != "Integer" && material_invoice_update_params["value"].class.to_s != "Float" && material_invoice_update_params["value"].present?
      valor1 = material_invoice_update_params["value"].gsub('$','').gsub(',','')
      params["value"] = valor1
    end

    if @material_invoice.update(material_invoice_update_params) 
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        register: @material_invoice,
        type: "success"
        
      }
      Material.set_state(@material_invoice.material_id)
    else 
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @material_invoice.errors.full_messages
      }
    end
  end

  def destroy
       material_invoice = @material_invoice.material_id
      if @material_invoice.destroy
        Material.set_state(material_invoice)
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
    defaults = { user_id: current_user.id }
    params.permit(:material_id, :user_id, :number, :value, :observation, :file).reverse_merge(defaults)
  end

  def material_invoice_update_params
    params.permit(:material_id, :user_id, :number, :value, :observation, :file)
  end
end

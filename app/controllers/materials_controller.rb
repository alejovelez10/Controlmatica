class MaterialsController < ApplicationController
  before_action :set_material, only: [:destroy, :update]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

  def index
    materials = ModuleControl.find_by_name("Materiales")

    create = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Eliminar").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete)
    }
  end

  def get_materials
    if params[:provider_id] || params[:sales_date] || params[:description]
      materials = Material.search(params[:provider_id], params[:sales_date], params[:description]).to_json( :include => { :cost_center => { :only =>[:code] }, :provider => { :only =>[:name] } })
    else
      materials = Material.all.to_json( :include => { :cost_center => { :only =>[:code] }, :provider => { :only =>[:name] } })
    end
    
    materials = JSON.parse(materials)
    render :json => materials
  end
  

  def create
    valor1 = material_params["amount"].gsub('$','').gsub(',','')
    valor2 = material_params["provider_invoice_value"].gsub('$','').gsub(',','')
    valor3 = material_params["provider_invoice_number"].gsub('$','').gsub(',','')
    
    params["amount"] = valor1
    params["provider_invoice_value"] = valor2
    params["provider_invoice_number"] = valor3

  	@material = Material.create(material_params)
      if @material.save
        render :json => {
          message: "¡El Registro fue creado con exito!",
          type: "success"
        }
      else
        render :json => {
          message: "¡El Registro no fue creado!",
          type: "error",
          message_error: @material.errors.full_messages
        }
    end
  	
  end

  def update
    if material_params["amount"].class.to_s != "Integer" 
      valor1 = material_params["amount"].gsub('$','').gsub(',','')
      params["amount"] = valor1

    elsif material_params["provider_invoice_number"].class.to_s != "Integer"
      valor2 = material_params["provider_invoice_number"].gsub('$','').gsub(',','')
      params["provider_invoice_number"] = valor2
      
    elsif material_params["provider_invoice_value"].class.to_s != "Integer"
      valor3 = material_params["provider_invoice_value"].gsub('$','').gsub(',','')
      params["provider_invoice_value"] = valor3
    end

    if @material.update(material_params) 
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        type: "success"
      }
    else 
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @material.errors.full_messages
      }
    end
  end

  def destroy
    if @material.destroy
      render :json => @material
    else 
      render :json => @material.errors.full_messages
    end
  end


  def set_material
  	@material = Material.find(params[:id])
  end

  def material_params
    params.permit(:provider_id, :sales_date, :sales_number, :amount, :delivery_date, :sales_state, :description, :provider_invoice_number, :provider_invoice_value, :cost_center_id, :user_id)
  end


end

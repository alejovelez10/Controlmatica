class MaterialsController < ApplicationController
  before_action :set_material, only: [:destroy, :update]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

  def index
    materials = ModuleControl.find_by_name("Materiales")

    create = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Eliminar").exists?
    download_file = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Descargar excel").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      download_file: (current_user.rol.name == "Administrador" ? true : download_file)
    }
  end

  def get_materials
    if params[:provider_id] || params[:sales_date] || params[:description] || params[:cost_center_id] || params[:estado]
      materials = Material.search(params[:provider_id], params[:sales_date], params[:description], params[:cost_center_id], params[:estado]).to_json( :include => { :cost_center => { :only =>[:code] }, :provider => { :only =>[:name] } })
      materials_total = Material.search(params[:provider_id], params[:sales_date], params[:description], params[:cost_center_id], params[:estado]).count

    elsif params[:filter]
      materials = Material.all.paginate(page: params[:page], :per_page => params[:filter]).to_json( :include => { :cost_center => { :only =>[:code] }, :provider => { :only =>[:name] } })
      materials_total = Material.all.count

    else
      materials = Material.all.paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :provider => { :only =>[:name] } })
      materials_total =  Material.all.count
    end
    
    materials = JSON.parse(materials)

    render :json => {materials_paginate: materials, materials_total: materials_total }
  end

  def download_file
    materials = Material.all
    respond_to do |format|

      format.xls do
      
        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet
        
        rows_format = Spreadsheet::Format.new color: :black,
        weight: :normal,
        size: 13,
        align: :left

        materials.each.with_index(1) do |task, i|
      
          position = sheet.row(i)
          
          sheet.row(1).default_format = rows_format    
          position[0] = task.cost_center.present? ? task.cost_center.code : ""
          position[1] = task.provider.present? ? task.provider.name : ""
          position[2] = task.sales_number
          position[3] = task.amount
          position[4] = task.description
          position[5] = task.sales_date
          position[6] = task.delivery_date
          position[7] = task.provider_invoice_value
          position[8] = task.sales_state
          
          
          sheet.row(i).height = 25
          sheet.column(i).width = 40
          sheet.row(i).default_format = rows_format
        
        end
        
        
        
        head_format = Spreadsheet::Format.new color: :white,      
        weight: :bold,
        size: 12,      
        pattern_bg_color: :xls_color_10,    
        pattern: 2,      
        vertical_align: :middle,      
        align: :left
        
        
        
        position = sheet.row(0)
        
        position[0] = "Centro de costo"
        position[1] = "Proveedor"
        position[2] = "# Orden"
        position[3] = "Valor"
        position[4] = "Descripción"
        position[5] = "Fecha de Orden"
        position[6] = "Fecha Entrega"
        position[7] = "Valor Factura"
        position[8] = "Estado"
        
        
        
        
        sheet.row(0).height = 20
        sheet.column(0).width = 40
        
        
        
        sheet.column(1).width = 40
        
        sheet.column(2).width = 40
        
        sheet.column(3).width = 40
        
        sheet.column(4).width = 40
        
        sheet.column(5).width = 40
        
        sheet.column(6).width = 40
        
        sheet.column(7).width = 40
        
        sheet.column(8).width = 40
        
        sheet.column(9).width = 40
        
        sheet.column(10).width = 40
        
        sheet.row(0).each.with_index { |c, i| sheet.row(0).set_format(i, head_format) }
        
        
        
        temp_file = StringIO.new
        
        task.write(temp_file)
        
        send_data(temp_file.string, :filename => "Materiales.xls", :disposition => 'inline')
        
        end  
    end

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


  if material_params["amount"].class.to_s != "Integer"  &&  material_params["amount"].class.to_s != "Float" 
      puts "asñljadñlfjadslfkñjasñjlkfdjskldsñlfal"
      valor1 = material_params["amount"].gsub('$','').gsub(',','')
      params["amount"] = valor1
  end


  if material_params["provider_invoice_value"].class.to_s != "Integer" &&  material_params["provider_invoice_value"].class.to_s != "Float"
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

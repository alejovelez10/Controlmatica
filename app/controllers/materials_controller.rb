class MaterialsController < ApplicationController
  before_action :set_material, only: [:destroy, :update]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token
  include ApplicationHelper

  def index
    materials = ModuleControl.find_by_name("Materiales")

    create = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Eliminar").exists?
    download_file = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Descargar excel").exists?
    update_state = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Forzar estados").exists?
    edit_all = current_user.rol.accion_modules.where(module_control_id: materials.id).where(name: "Editar todos").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      edit_all: (current_user.rol.name == "Administrador" ? true : edit_all),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      update_state: (current_user.rol.name == "Administrador" ? true : update_state),
      download_file: (current_user.rol.name == "Administrador" ? true : download_file)
    }
  end


  def get_materials

    if params[:filtering] == "true"
      materials = Material.search(params[:provider_id], params[:sales_date], params[:description], params[:cost_center_id], params[:estado], params[:date_desde], params[:date_hasta], params[:sales_number]).order(created_at: :desc).paginate(page: params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code, :sales_state] }, :provider => { :only =>[:name] }, :last_user_edited => { :only =>[:names, :id] }, :user => { :only =>[:names, :id] } })
      materials_total = Material.search(params[:provider_id], params[:sales_date], params[:description], params[:cost_center_id], params[:estado], params[:date_desde], params[:date_hasta], params[:sales_number]).order(created_at: :desc)

    elsif params[:filtering] == "false"
      materials = Material.all.order(created_at: :desc).paginate(page: params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code, :sales_state] }, :provider => { :only =>[:name] }, :material_invoices => { :only => [:number, :value, :observation] }, :last_user_edited => { :only =>[:names, :id] }, :user => { :only =>[:names, :id] } })
      materials_total = Material.all
    else
      
      materials = Material.all.order(created_at: :desc).paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code, :sales_state] }, :provider => { :only =>[:name] }, :material_invoices => { :only => [:number, :value, :observation] }, :last_user_edited => { :only =>[:names, :id] }, :user => { :only =>[:names, :id] } })
      materials_total =  Material.all
    end
    
    materials = JSON.parse(materials)

    render :json => {materials_paginate: materials, materials_total: materials_total }
  end

  def update_state_materials 
    material = Material.find(params[:id])
    update_material = material.update(sales_state: params[:state])
    
    if update_material
      render :json => {
        message: "¡El Estado fue actualizado con exito!",
        type: "success"
      }
    end
  end

  def download_file

    if params[:ids] != "todos"
      id = params[:ids].split(",")
      materials = Material.where(id: id)
    else
      materials = Material.all
    end

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
    valor1 = material_params_create["amount"].gsub('$','').gsub(',','')
    params["amount"] = valor1

  	@material = Material.create(material_params_create)
      if @material.save
        recalculate_cost_center(@material.cost_center_id,"materiales")
        render :json => {
          message: "¡El Registro fue creado con exito!",
          type: "success"
        }

        Material.set_state(@material.id)
      else
        render :json => {
          message: "¡El Registro no fue creado!",
          type: "error",
          message_error: @material.errors.full_messages
        }
    end
  	
  end

  def update


  if material_params_update["amount"].class.to_s != "Integer"  &&  material_params_update["amount"].class.to_s != "Float" 
      puts "asñljadñlfjadslfkñjasñjlkfdjskldsñlfal"
      valor1 = material_params_update["amount"].gsub('$','').gsub(',','')
      params["amount"] = valor1
  end

    if @material.update(material_params_update.merge!(update_user: current_user.id)) 
      recalculate_cost_center(@material.cost_center_id)
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        type: "success"
      }

      Material.set_state(@material.id)
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

  def material_params_create
    defaults = { user_id: current_user.id}
    params.permit(:provider_id, :sales_date, :sales_number, :amount, :delivery_date, :sales_state, :description, :provider_invoice_number, :provider_invoice_value, :cost_center_id, :user_id, :update_user).reverse_merge(defaults)
  end

  def material_params_update
    params.permit(:provider_id, :sales_date, :sales_number, :amount, :delivery_date, :sales_state, :description, :provider_invoice_number, :provider_invoice_value, :cost_center_id, :user_id, :update_user)
  end


end

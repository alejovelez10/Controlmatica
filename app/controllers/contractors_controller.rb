class ContractorsController < ApplicationController
  before_action :set_contractor, only: [:destroy, :update]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token

  def index
    contractors = ModuleControl.find_by_name("Tableristas")

    create = current_user.rol.accion_modules.where(module_control_id: contractors.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: contractors.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: contractors.id).where(name: "Eliminar").exists?
    download_file = current_user.rol.accion_modules.where(module_control_id: contractors.id).where(name: "Descargar excel").exists?

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      download_file: (current_user.rol.name == "Administrador" ? true : download_file)
    }
  end

  def get_contractors
    if params[:user_execute_id] || params[:sales_date] || params[:cost_center_id] || params[:date_desde] || params[:date_hasta]
      contractor = Contractor.search(params[:user_execute_id], params[:sales_date], params[:cost_center_id], params[:date_desde], params[:date_hasta]).to_json( :include => { :cost_center => { :only =>[:code] }, :user_execute => { :only =>[:names] } })
      contractor_total = Contractor.search(params[:user_execute_id], params[:sales_date], params[:cost_center_id], params[:date_desde], params[:date_hasta]).count

    elsif params[:filter]
      contractor = Contractor.all.paginate(page: params[:page], :per_page => params[:filter]).to_json( :include => { :cost_center => { :only =>[:code] }, :user_execute => { :only =>[:names] } })
      contractor_total = Contractor.all.count

    else
      contractor = Contractor.all.paginate(:page => params[:page], :per_page => 10).to_json( :include => { :cost_center => { :only =>[:code] }, :user_execute => { :only =>[:names] } })
      contractor_total =  Contractor.all.count
    end
    
    contractor = JSON.parse(contractor)

    render :json => {contractors_paginate: contractor, contractors_total: contractor_total}
  end

  def download_file
    contractor = Contractor.all
    respond_to do |format|

      format.xls do
      
        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet
        
        rows_format = Spreadsheet::Format.new color: :black,
        weight: :normal,
        size: 13,
        align: :left

        contractor.each.with_index(1) do |task, i|
      
          position = sheet.row(i)
          
          sheet.row(1).default_format = rows_format    
          position[0] = task.sales_date
          position[1] = task.cost_center.present? ? task.cost_center.code : ""
          position[2] = task.hours
          position[3] = task.user_execute.present? ? task.user_execute.names : ""
          position[4] = task.description
          
          
          
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
        
        position[0] = "Fecha"
        position[1] = "Centro de costo"
        position[2] = "Horas"
        position[3] = "Trabajo realizado por"
        position[4] = "Descripcion"
        
        
        
        
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
        
        send_data(temp_file.string, :filename => "Tableristas.xls", :disposition => 'inline')
        
        end  
    end

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
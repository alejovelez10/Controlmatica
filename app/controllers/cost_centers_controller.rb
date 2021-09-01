class CostCentersController < ApplicationController
  before_action :set_cost_center, only: [:show, :edit, :update, :destroy, :cost_center_customer, :get_show_center]
  before_action :set_sales_order, only: [:show]
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token
  include ApplicationHelper

  # GET /cost_centers
  # GET /cost_centers.json
  def index
    if params[:search1] || params[:search2] || params[:search3] || params[:search4]
      @cost_centers = CostCenter.all.search(params[:search1],params[:search2],params[:search3],params[:search4]).paginate(:page => params[:page], :per_page => 10)
    else
      @cost_centers = CostCenter.all.paginate(:page => params[:page], :per_page => 10)
    end
    
    cost_centers = ModuleControl.find_by_name("Centro de Costos")

    create = current_user.rol.accion_modules.where(module_control_id: cost_centers.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: cost_centers.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: cost_centers.id).where(name: "Eliminar").exists?
    manage_module = current_user.rol.accion_modules.where(module_control_id: cost_centers.id).where(name: "Gestionar modulo").exists?
    ending = current_user.rol.accion_modules.where(module_control_id: cost_centers.id).where(name: "Finalizar").exists?
    download_file = current_user.rol.accion_modules.where(module_control_id: cost_centers.id).where(name: "Descargar excel").exists?
    update_state = current_user.rol.accion_modules.where(module_control_id: cost_centers.id).where(name: "Forzar estados").exists?
    show_hours = current_user.rol.accion_modules.where(module_control_id: cost_centers.id).where(name: "Ver horas costo").exists?
    state_update = current_user.rol.accion_modules.where(module_control_id: cost_centers.id).where(name: "Forzar estados").exists?
    edit_all = current_user.rol.accion_modules.where(module_control_id: cost_centers.id).where(name: "Editar todos").exists?


    @hours_real = Parameterization.where(name: "HORA HOMBRE COSTO").first.money_value
    @hours_invoices = Parameterization.where(name: "HORA HOMBRE COTIZADA").first.money_value

    @hours_real_contractor = Parameterization.where(name: "HORA TABLERISTA COSTO").first.money_value
    @value_displacement_hours = Parameterization.where(name: "HORA DESPLAZAMIENTO").first.money_value


    

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      edit_all: (current_user.rol.name == "Administrador" ? true : edit_all),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      manage_module: (current_user.rol.name == "Administrador" ? true : manage_module),
      ending: (current_user.rol.name == "Administrador" ? true : ending),
      download_file: (current_user.rol.name == "Administrador" ? true : download_file),
      update_state: (current_user.rol.name == "Administrador" ? true : update_state),
      show_hours: (current_user.rol.name == "Administrador" ? true : show_hours),
      state_update: (current_user.rol.name == "Administrador" ? true : state_update),
    }
  end

  def get_cost_centers
    centro = ModuleControl.find_by_name("Centro de Costos")
    estado = current_user.rol.accion_modules.where(module_control_id: centro.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)

    if validate
      
      if params[:filtering] == "true"
        cost_centers = CostCenter.all.search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state], params[:cost_center_id], params[:service_type], params[:date_desde], params[:date_hasta], params[:quotation_number]).paginate(page: params[:page], :per_page => 10).order(created_at: :desc)
        cost_centers_total = CostCenter.search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state], params[:cost_center_id], params[:service_type], params[:date_desde], params[:date_hasta], params[:quotation_number])

      elsif params[:filtering] == "false"
        cost_centers = CostCenter.all.paginate(page: params[:page], :per_page => 10).order(created_at: :desc)
        cost_centers_total = CostCenter.all
      else
        cost_centers = CostCenter.all.paginate(page: params[:page], :per_page => 10).order(created_at: :desc)
        cost_centers_total =  CostCenter.all
      end

    else

      if params[:filtering] == "true"
        cost_centers = CostCenter.where(user_id: current_user.id).search(params[:descripcion], params[:customer_id], params[:cost_center_id], params[:execution_state], params[:invoiced_state], params[:cost_center_id], params[:service_type], params[:date_desde], params[:date_hasta], params[:quotation_number]).paginate(page: params[:page], :per_page => 10).order(created_at: :desc)
        cost_centers_total = CostCenter.search(params[:descripcion], params[:customer_id], params[:cost_center_id], params[:execution_state], params[:invoiced_state], params[:cost_center_id], params[:service_type], params[:date_desde], params[:date_hasta], params[:quotation_number])

      elsif params[:filtering] == "false"
        cost_centers = CostCenter.where(user_id: current_user.id).paginate(page: params[:page], :per_page => 10).order(created_at: :desc)
        cost_centers_total = CostCenter.where(user_id: current_user.id)
      else
        
        cost_centers = CostCenter.where(user_id: current_user.id).paginate(page: params[:page], :per_page => 10).order(created_at: :desc)
        cost_centers_total =  CostCenter.where(user_id: current_user.id)
      end

    end



    cost_centers = cost_centers.to_json( :include => {  :customer => { :only =>[:name] }, :contact => { :only =>[:name,:id] }, :last_user_edited => { :only =>[:names, :id] }, :user => { :only =>[:names, :id] }, :sales_orders => { :only =>[:order_value] } })


    cost_centers = JSON.parse(cost_centers)
    render :json => {cost_centers_paginate: cost_centers, cost_centers_total: cost_centers_total }
  end


  def update_state_centro
    centro = CostCenter.find(params[:id])

    if params[:from] == "execution_state"
      update_centro = centro.update(execution_state: params[:state])
    else
      update_centro = centro.update(invoiced_state: params[:state])
    end

    if update_centro
      render :json => {
        message: "¡El Registro fue Actualizado con exito!",
        type: "success"
      }
    end
  end
  

  # GET /cost_centers/1
  # GET /cost_centers/1.json
  def show
    cost_centers = ModuleControl.find_by_name("Centro de Costos")
    update_state = current_user.rol.accion_modules.where(module_control_id: cost_centers.id).where(name: "Forzar estados").exists?
    show_hours = current_user.rol.accion_modules.where(module_control_id: cost_centers.id).where(name: "Ver horas costo").exists?

    @estados = {    
      update_state: (current_user.rol.name == "Administrador" ? true : update_state),
      show_hours: (current_user.rol.name == "Administrador" ? true : show_hours),
    }

    @customer_invoice = CustomerInvoice.where(cost_center_id: @cost_center.id)
  end

  def customer_cost_center
    customer = Customer.find(params[:id])
    centro = CostCenter.where(customer_id: customer.id)
    report = Report.where(customer_id: customer.id)

    render :json => {
      data_cost_center: centro,
      data_contact: customer.contacts
    }
  end

  def get_show_center

    ing_cotizado = @cost_center.engineering_value

    ing_real = @cost_center.reports.sum(:working_value)

    via_cotizado = @cost_center.viatic_value

    
    via_real = @cost_center.reports.sum(:viatic_value)


    #INGENIERIA EJECUCION
    #Horas ejecutadas agregadas desde los reportes
    horas_eje = @cost_center.reports.sum(:working_time)
    porc_eje =  @cost_center.eng_hours > 0 ? (((horas_eje.to_f/@cost_center.eng_hours))*100).round(1) : "N/A"
    #FIN INGENIERIA EJECUCUCION

    #INGENIERIA COSTO
    #costo de horeas ejecutadas en dinero
    cotizado_desplazamiento = @cost_center.value_displacement_hours * @cost_center.displacement_hours
    ejecutado_desplazamiento = @cost_center.reports.sum(:value_displacement_hours)
    ejecutado_desplazamiento_horas = @cost_center.reports.sum(:displacement_hours)


    porc_desplazamiento =  @cost_center.displacement_hours > 0 ? (((ejecutado_desplazamiento_horas.to_f/@cost_center.displacement_hours))*100).round(1) : "N/A"

    

    costo_en_dinero = (@cost_center.hour_cotizada * @cost_center.eng_hours).round(1) + cotizado_desplazamiento
    costo_real_en_dinero = (@cost_center.hour_real * horas_eje).to_i + ejecutado_desplazamiento
    porc_eje_costo =  costo_en_dinero > 0 ? (((1 - (costo_real_en_dinero.to_f/costo_en_dinero))*100)).round(1) : "N/A"
    #FIN INGENIERIA COSTO


    hours_eje_contractor = @cost_center.contractors.sum(:hours)

    facturacion = @cost_center.customer_invoices.sum(:invoice_value)


   

    porc_eje_contractor =  @cost_center.hours_contractor > 0 ? (((hours_eje_contractor.to_f/@cost_center.hours_contractor))*100).round(1) : "N/A"



    costo_real_en_dinero_contractor = (@cost_center.hours_contractor_real * hours_eje_contractor).round(1)
    costo_en_dinero_contractor = (@cost_center.hours_contractor_invoices * @cost_center.hours_contractor).round(1)

    

    porc_eje_costo_contractor =  costo_en_dinero_contractor > 0 ? (((1 - (costo_real_en_dinero_contractor.to_f/costo_en_dinero_contractor))*100)).round(1) : "N/A"

    
    porc_via =  via_cotizado > 0 ? ((via_real.to_f/via_cotizado)*100).round(1) : "N/A" 

    porc_fac =  @cost_center.quotation_value > 0 ? ((facturacion.to_f/@cost_center.quotation_value)*100).round(1) : "N/A" 

    total_eje = @cost_center.hour_real * horas_eje

    total_cot= @cost_center.hour_cotizada * horas_eje

    total_margen = total_cot - total_eje 

    porc_ejec =  total_cot > 0 ? ( (total_margen.to_f/total_cot)*100).round(1) : "N/A" 

    cost_center = @cost_center.to_json( :include => { :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :user_owner => { :only =>[:names, :id] } })

    sum_materials = @cost_center.materials.sum(:amount)  #Material.where(cost_center_id: @cost_center.id).sum(:amount)

    porc_mat =  (@cost_center.materials_value != nil ? @cost_center.materials_value : 0 )> 0 ? ((1- (sum_materials.to_f/@cost_center.materials_value))*100).round(1) : "N/A" 


    sum_contractors =  @cost_center.contractors.sum(:ammount)  #Contractor.where(cost_center_id: @cost_center.id).sum(:ammount)



    cost_center = JSON.parse(cost_center)
    
    render :json => {
      data_show: cost_center,
      data_orders: @cost_center.sales_orders,

      horas_eje: horas_eje,
      porc_eje: porc_eje,
      
      via_cotizado: via_cotizado,
      via_real: via_real,
      porc_via: porc_via,





      porc_eje_contractor: porc_eje_contractor,
      hours_eje_contractor: hours_eje_contractor,
      hours_contractor: @cost_center.hours_contractor,

      costo_en_dinero_contractor: costo_en_dinero_contractor,
      costo_real_en_dinero_contractor: costo_real_en_dinero_contractor,
      porc_eje_costo_contractor: porc_eje_costo_contractor,



      ejecutado_desplazamiento_horas: ejecutado_desplazamiento_horas,
      porc_desplazamiento: porc_desplazamiento,


      costo_en_dinero: costo_en_dinero,
      costo_real_en_dinero: costo_real_en_dinero,
      porc_eje_costo: porc_eje_costo,

      facturacion: facturacion,
      porc_fac: porc_fac,
      sum_materials: sum_materials,
      sum_contractors: sum_contractors,
     
      
      porc_mat: (porc_mat != nil ? porc_mat : 0)


      
    }
    
  end

  def getValues
    cost_center = CostCenter.find(params[:id])
    sales_ordes = cost_center.sales_orders.to_json( :include => {  :cost_center=> { :include => :customer , :only =>[:code, :invoiced_state]} , :customer_invoices => { :only =>[:invoice_value, :invoice_date, :number_invoice] } })
    reportes = cost_center.reports.to_json( :include => { :cost_center=> { :include => :customer , :only =>[:code, :description]}, :customer => { :only =>[:name] }, :contact => { :only =>[:name] }, :report_execute => { :only =>[:names] } })
    contractors = cost_center.contractors.to_json( :include => { :cost_center => { :only =>[:code] }, :user_execute => { :only =>[:names] } })
    materiales = cost_center.materials.to_json( :include => { :cost_center => { :only =>[:code] }, :provider => { :only =>[:name] }, :material_invoices => { :only => [:number, :value, :observation] } })

    sales_ordes = JSON.parse(sales_ordes)
    reportes = JSON.parse(reportes)
    contractors = JSON.parse(contractors)
    materiales = JSON.parse(materiales)

    values = {
      dataMateriales: materiales,
      dataContractors: contractors,
      dataSalesOrdes: sales_ordes,
      dataReports: reportes,
    }
    render :json => values
  end


  # GET /cost_centers/new
  def new
    @cost_center = CostCenter.new
  end

  # GET /cost_centers/1/edit
  def edit
  end

  # POST /cost_centers
  # POST /cost_centers.json


  def create




    if params["viatic_value"] != "nil" || params["viatic_value"] != ""
      valor1 = cost_center_params_create["viatic_value"].gsub('$','').gsub(',','')
      params["viatic_value"] = valor1
    end

    if params["quotation_value"] != "nil" || params["quotation_value"] != ""
      valor2 = cost_center_params_create["quotation_value"].gsub('$','').gsub(',','')
      params["quotation_value"] = valor2
    end

    if params["hour_real"] != "nil" || params["hour_real"] != ""
      if cost_center_params_create["hour_real"].class.to_s != "Integer" && cost_center_params_create["hour_real"].class.to_s != "Float" 
        valor3 = cost_center_params_create["hour_real"].gsub('$','').gsub(',','')
        params["hour_real"] = valor3
      end
    end

    if params["hour_cotizada"] != "nil" || params["hour_cotizada"] != ""
      if cost_center_params_create["hour_cotizada"].class.to_s != "Integer" && cost_center_params_create["hour_cotizada"].class.to_s != "Float"
        valor4 = cost_center_params_create["hour_cotizada"].gsub('$','').gsub(',','')
        params["hour_cotizada"] = valor4
      end
    end

    if params["hours_contractor_real"] != "nil" || params["hours_contractor_real"] != ""
      if cost_center_params_create["hours_contractor_real"].class.to_s != "Integer" && cost_center_params_create["hours_contractor_real"].class.to_s != "Float" 
      valor5 = cost_center_params_create["hours_contractor_real"].gsub('$','').gsub(',','')
      params["hours_contractor_real"] = valor5
      end
    end

    if params["hours_contractor_invoices"] != "nil" || params["hours_contractor_invoices"] != ""
      if cost_center_params_create["hours_contractor_invoices"].class.to_s != "Integer" && cost_center_params_create["hours_contractor_invoices"].class.to_s != "Float" 
      valor6 = cost_center_params_create["hours_contractor_invoices"].gsub('$','').gsub(',','')
      params["hours_contractor_invoices"] = valor6
      end
    end

    if params["materials_value"] != "nil" || params["materials_value"] != ""
      valor7 = cost_center_params_create["materials_value"].gsub('$','').gsub(',','')
      params["materials_value"] = valor7
    end

    if params["quotation_value"]  != "nil" || params["quotation_value"] != ""
      valor8 = cost_center_params_create["quotation_value"].gsub('$','').gsub(',','')
      params["quotation_value"] = valor8
    end

    if params["displacement_hours"]  != "nil" || params["displacement_hours"] != ""
      valor9 = cost_center_params_create["displacement_hours"].gsub('$','').gsub(',','')
      params["displacement_hours"] = valor9
    end

    if params["value_displacement_hours"]  != "nil" || params["value_displacement_hours"] != ""
      if cost_center_params_create["value_displacement_hours"].class.to_s != "Integer" && cost_center_params["value_displacement_hours"].class.to_s != "Float" 
        valo10 = cost_center_params_create["value_displacement_hours"].gsub('$','').gsub(',','')
        params["value_displacement_hours"] = valo10
      end
    end

    @cost_center = CostCenter.create(cost_center_params_create)

      if @cost_center.save
        render :json => {
          message: "¡El Registro fue creado con exito!",
          type: "success"
        }
      else
        render :json => {
          message: "¡El Registro no fue creado!",
          type: "error",
          message_error: @cost_center.errors.full_messages
        }
      end
  	
  end

  def download_file
    centro = ModuleControl.find_by_name("Centro de Costos")
    estado = current_user.rol.accion_modules.where(module_control_id: centro.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)

    if validate
      if params[:ids] == "filtro"
        centro_show = CostCenter.search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state], params[:cost_center_id], params[:service_type], params[:date_desde], params[:date_hasta], params[:quotation_number])
      else
        centro_show = CostCenter.all
      end

    else

      if params[:ids] == "filtro"
        centro_show = Contractor.where(user_id: current_user.id).search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state], params[:cost_center_id], params[:service_type], params[:date_desde], params[:date_hasta], params[:quotation_number])
      else
        centro_show = CostCenter.where(user_id: current_user.id)
      end

    end

    respond_to do |format|

      format.xls do
      
        task = Spreadsheet::Workbook.new
        sheet = task.create_worksheet
        
        rows_format = Spreadsheet::Format.new color: :black,
        weight: :normal,
        size: 13,
        align: :left

        centro_show.each.with_index(1) do |task, i|
      
          position = sheet.row(i)
          
          sheet.row(1).default_format = rows_format    
          position[0] = task.code
          position[1] = task.customer.present? ? task.customer.name : ""
          position[2] = task.service_type
          position[3] = task.description
          position[4] = task.quotation_number

          position[5] = task.engineering_value
          position[6] = task.sum_executed
          position[7] = task.viatic_value
          position[8] = task.sum_viatic
          position[9] = get_state_center(task)
          position[10] = task.execution_state
          position[11] = task.invoiced_state
          
          
          
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
        
        position[0] = "Codigo"
        position[1] = "Cliente"
        position[2] = "Tipo"
        position[3] = "Descripcion"
        position[4] = "Número de cotización"
        position[5] = "$ Ingeniería Cotizado"
        position[6] = "$ Ingeniería Ejecutado"
        position[7] = "$ Viaticos Cotizado"
        position[8] = "$ Viaticos Real"
        position[9] = "¿Finalizo?"
        position[10] = "Estado de ejecución"
        position[11] = "Estado facturado"

        
        
        
        
        
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
        sheet.column(11).width = 45
        
        sheet.row(0).each.with_index { |c, i| sheet.row(0).set_format(i, head_format) }
        
        
        
        temp_file = StringIO.new
        
        task.write(temp_file)
        
        send_data(temp_file.string, :filename => "Centro_de_Costo.xls", :disposition => 'inline')
        
        end  
    end

  end


  # PATCH/PUT /cost_centers/1
  # PATCH/PUT /cost_centers/1.json
  def update

    if params[:viatic_value] || params[:quotation_value] || params[:hour_real] || params[:hours_contractor_real] || params[:hours_contractor_invoices] || params[:materials_value] || params[:displacement_hours] || params[:value_displacement_hours]

      if cost_center_params_update["viatic_value"].class.to_s != "Integer" && cost_center_params_update["viatic_value"].class.to_s != "Float" && cost_center_params_update["viatic_value"].present?
        valor1 = cost_center_params_update["viatic_value"].gsub('$','').gsub(',','')
        params["viatic_value"] = valor1
      end

      if cost_center_params_update["quotation_value"].class.to_s != "Integer" && cost_center_params_update["quotation_value"].class.to_s != "Float" && cost_center_params_update["quotation_value"].present?
        valor2 = cost_center_params_update["quotation_value"].gsub('$','').gsub(',','')
        params["quotation_value"] = valor2
      end
      
      if cost_center_params_update["hour_real"].class.to_s != "Integer" && cost_center_params_update["hour_real"].class.to_s != "Float" && cost_center_params_update["hour_real"].present?
        valor3 = cost_center_params_update["hour_real"].gsub('$','').gsub(',','')
        params["hour_real"] = valor3
      end

      if cost_center_params_update["hour_cotizada"].class.to_s != "Integer" && cost_center_params_update["hour_cotizada"].class.to_s != "Float" && cost_center_params_update["hour_cotizada"].present?
        valor7 = cost_center_params_update["hour_cotizada"].gsub('$','').gsub(',','')
        params["hour_cotizada"] = valor7
      end
      
      if cost_center_params_update["hours_contractor_real"].class.to_s != "Integer" && cost_center_params_update["hours_contractor_real"].class.to_s != "Float" && cost_center_params_update["hours_contractor_real"].present?
        valor4 = cost_center_params_update["hours_contractor_real"].gsub('$','').gsub(',','')
        params["hours_contractor_real"] = valor4
      end

      if cost_center_params_update["hours_contractor_invoices"].class.to_s != "Integer" && cost_center_params_update["hours_contractor_invoices"].class.to_s != "Float" && cost_center_params_update["hours_contractor_invoices"].present?
        valor5 = cost_center_params_update["hours_contractor_invoices"].gsub('$','').gsub(',','')
        params["hours_contractor_invoices"] = valor5
      end

      if cost_center_params_update["materials_value"].class.to_s != "Integer" && cost_center_params_update["materials_value"].class.to_s != "Float" && cost_center_params_update["materials_value"].present?
        valor6 = cost_center_params_update["materials_value"].gsub('$','').gsub(',','')
        params["materials_value"] = valor6
      end

      if cost_center_params_update["displacement_hours"].class.to_s != "Integer" && cost_center_params_update["displacement_hours"].class.to_s != "Float" && cost_center_params_update["displacement_hours"].present?
        valor7 = cost_center_params_update["displacement_hours"].gsub('$','').gsub(',','')
        params["displacement_hours"] = valor7
      end

      if cost_center_params_update["value_displacement_hours"].class.to_s != "Integer" && cost_center_params_update["value_displacement_hours"].class.to_s != "Float" && cost_center_params_update["value_displacement_hours"].present?
        valor8 = cost_center_params_update["value_displacement_hours"].gsub('$','').gsub(',','')
        params["value_displacement_hours"] = valor8
      end

    end

    if @cost_center.update(cost_center_params_update.merge!(update_user: current_user.id)) 
      recalculate_cost_center(@cost_center.id)
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        type: "success",
        register: @cost_center
      }

    else 
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @cost_center.errors.full_messages
      }
    end
  end


  # DELETE /cost_centers/1
  # DELETE /cost_centers/1.json
  def destroy
    if @cost_center.destroy
      render :json => @cost_center
    else 
      render :json => @cost_center.errors.full_messages
    end
  end

  def change_state_ended
    @cost_center = CostCenter.find(params[:id])
    state = @cost_center.invoiced_state == "LEGALIZADO" ? "POR FACTURAR" : @cost_center.invoiced_state
    @fac = @cost_center.invoiced_state == "LEGALIZADO" ? true : false

    @cost_center.update(execution_state: "FINALIZADO", invoiced_state: state)

    render :json => true
    
  end
  private
    # Use callbacks to share common setup or constraints between actions.
    def set_cost_center
      @cost_center = CostCenter.find(params[:id])
    end

    def set_sales_order
       
    end

    # Never trust parameters from the scary internet, only allow the white list through.

    def cost_center_params_create
      defaults = { user_id: current_user.id}
      params.permit(:customer_id, :contact_id, :user_id, :description, :start_date, :end_date, :quotation_number, :engineering_value, :viatic_value, :execution_state, :invoiced_state, :service_type, :code, :count, :eng_hours,:hour_cotizada, :hour_real, :quotation_value, :user_id, :work_force_contractor, :hours_contractor_invoices, :hours_contractor_real, :materials_value, :hours_contractor, :displacement_hours, :value_displacement_hours, :offset_value, :update_user, :user_owner_id).reverse_merge(defaults)
    end
  
    def cost_center_params_update
      params.permit(:customer_id, :contact_id, :user_id, :description, :start_date, :end_date, :quotation_number, :engineering_value, :viatic_value, :execution_state, :invoiced_state, :service_type, :code, :count, :eng_hours,:hour_cotizada, :hour_real, :quotation_value, :user_id, :work_force_contractor, :hours_contractor_invoices, :hours_contractor_real, :materials_value, :hours_contractor, :displacement_hours, :value_displacement_hours, :offset_value, :update_user, :user_owner_id)
    end
end

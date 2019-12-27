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

    @hours_real = Parameterization.where(name: "HORA HOMBRE COSTO").first.money_value
    @hours_invoices = Parameterization.where(name: "HORA HOMBRE COTIZADA").first.money_value

    @estados = {      
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      manage_module: (current_user.rol.name == "Administrador" ? true : manage_module),
      ending: (current_user.rol.name == "Administrador" ? true : ending),
      download_file: (current_user.rol.name == "Administrador" ? true : download_file)
    }
  end

  def get_cost_centers
    centro = ModuleControl.find_by_name("Centro de Costos")
    estado = current_user.rol.accion_modules.where(module_control_id: centro.id).where(name: "Ver todos").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)

    if validate
      if params[:descripcion] || params[:customer_id] || params[:execution_state] || params[:invoiced_state]
        @cost_centers = CostCenter.all.paginate(page: params[:page], :per_page => 10).search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state])
        @cost_centers_total = CostCenter.all.search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state]).count

      elsif params[:filter]
        @cost_centers = CostCenter.all.paginate(page: params[:page], :per_page => params[:filter])
        @cost_centers_total = CostCenter.all.count
      else
        @cost_centers = CostCenter.all.paginate(page: params[:page], :per_page => 10).order(id: :desc)
        @cost_centers_total = CostCenter.all.count
      end

    else

      if params[:descripcion] || params[:customer_id] || params[:execution_state] || params[:invoiced_state]
        @cost_centers = CostCenter.where(user_id: current_user.id).paginate(page: params[:page], :per_page => 10).search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state])
        @cost_centers_total = CostCenter.where(user_id: current_user.id).search(params[:descripcion], params[:customer_id], params[:execution_state], params[:invoiced_state]).count

      elsif params[:filter]
        @cost_centers = CostCenter.where(user_id: current_user.id).paginate(page: params[:page], :per_page => params[:filter])
        @cost_centers_total = CostCenter.where(user_id: current_user.id).count
      else
        @cost_centers = CostCenter.where(user_id: current_user.id).paginate(page: params[:page], :per_page => 10).order(id: :desc)
        @cost_centers_total = CostCenter.where(user_id: current_user.id).count
      end

          
    end



    @cost_centers =  @cost_centers.to_json( :include => {  :customer => { :only =>[:name] }, :contact => { :only =>[:name,:id] } })


    @cost_centers = JSON.parse(@cost_centers)
    render :json => {cost_centers_paginate: @cost_centers, cost_centers_total: @cost_centers_total }
  end
  

  # GET /cost_centers/1
  # GET /cost_centers/1.json
  def show
    sales_orders = ModuleControl.find_by_name("Ordenes de Compra")

    login_module = current_user.rol.accion_modules.where(module_control_id: sales_orders.id).where(name: "Ingreso al modulo").exists?
    create = current_user.rol.accion_modules.where(module_control_id: sales_orders.id).where(name: "Crear").exists?
    edit = current_user.rol.accion_modules.where(module_control_id: sales_orders.id).where(name: "Editar").exists?
    delete = current_user.rol.accion_modules.where(module_control_id: sales_orders.id).where(name: "Eliminar").exists?
    gestionar = current_user.rol.accion_modules.where(module_control_id: sales_orders.id).where(name: "Gestionar").exists?

    @estados = {    
      login_module: (current_user.rol.name == "Administrador" ? true : login_module),
      create: (current_user.rol.name == "Administrador" ? true : create),
      edit: (current_user.rol.name == "Administrador" ? true : edit),
      delete: (current_user.rol.name == "Administrador" ? true : delete),
      gestionar: (current_user.rol.name == "Administrador" ? true : gestionar)
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

    horas_eje = @cost_center.reports.sum(:working_time)
    hours_eje_contractor = @cost_center.contractors.sum(:hours)

    facturacion = @cost_center.customer_invoices.sum(:invoice_value)

    porc_eje =  @cost_center.eng_hours > 0 ? (((horas_eje.to_f/@cost_center.eng_hours))*100).to_i : "N/A"

    porc_eje_contractor =  @cost_center.hours_contractor > 0 ? (((hours_eje_contractor.to_f/@cost_center.hours_contractor))*100).to_i : "N/A"

    costo_real_en_dinero = (@cost_center.hour_real * horas_eje).to_i
    costo_en_dinero = (@cost_center.hour_cotizada * @cost_center.eng_hours).to_i

    costo_real_en_dinero_contractor = (@cost_center.hours_contractor_real * hours_eje_contractor).to_i
    costo_en_dinero_contractor = (@cost_center.hours_contractor_invoices * @cost_center.hours_contractor).to_i

    porc_eje_costo =  costo_en_dinero > 0 ? (((1 - (costo_real_en_dinero.to_f/costo_en_dinero))*100)).to_i : "N/A"

    porc_eje_costo_contractor =  costo_en_dinero_contractor > 0 ? (((1 - (costo_real_en_dinero_contractor.to_f/costo_en_dinero_contractor))*100)).to_i : "N/A"

    porc_via =  via_cotizado > 0 ? ((via_real.to_f/via_cotizado)*100).to_i : "N/A" 

    porc_fac =  @cost_center.quotation_value > 0 ? ((facturacion.to_f/@cost_center.quotation_value)*100).to_i : "N/A" 

    total_eje = @cost_center.hour_real * horas_eje

    total_cot= @cost_center.hour_cotizada * horas_eje

    total_margen = total_cot - total_eje 

    porc_ejec =  total_cot > 0 ? ( (total_margen.to_f/total_cot)*100).to_i : "N/A" 

    cost_center = @cost_center.to_json( :include => { :customer => { :only =>[:name] }, :contact => { :only =>[:name] } })

    sum_materials = @cost_center.materials.sum(:amount)  #Material.where(cost_center_id: @cost_center.id).sum(:amount)

    porc_mat =  (@cost_center.materials_value != nil ? @cost_center.materials_value : 0 )> 0 ? ((1- (sum_materials.to_f/@cost_center.materials_value))*100).to_i : "N/A" 


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
      valor1 = cost_center_params["viatic_value"].gsub('$','').gsub(',','')
      params["viatic_value"] = valor1
    end

    if params["quotation_value"] != "nil" || params["quotation_value"] != ""
      valor2 = cost_center_params["quotation_value"].gsub('$','').gsub(',','')
      params["quotation_value"] = valor2
    end

    if params["hour_real"] != "nil" || params["hour_real"] != ""
      if cost_center_params["hour_real"].class.to_s != "Integer" && cost_center_params["hour_real"].class.to_s != "Float" 
        valor3 = cost_center_params["hour_real"].gsub('$','').gsub(',','')
        params["hour_real"] = valor3
      end
    end

    if params["hour_cotizada"] != "nil" || params["hour_cotizada"] != ""
      if cost_center_params["hour_cotizada"].class.to_s != "Integer" && cost_center_params["hour_cotizada"].class.to_s != "Float"
        valor4 = cost_center_params["hour_cotizada"].gsub('$','').gsub(',','')
        params["hour_cotizada"] = valor4
      end
    end

    if params["hours_contractor_real"] != "nil" || params["hours_contractor_real"] != ""
      if cost_center_params["hours_contractor_real"].class.to_s != "Integer" && cost_center_params["hours_contractor_real"].class.to_s != "Float" 
      valor5 = cost_center_params["hours_contractor_real"].gsub('$','').gsub(',','')
      params["hours_contractor_real"] = valor5
      end
    end

    if params["hours_contractor_invoices"] != "nil" || params["hours_contractor_invoices"] != ""
      if cost_center_params["hours_contractor_invoices"].class.to_s != "Integer" && cost_center_params["hours_contractor_invoices"].class.to_s != "Float" 
      valor6 = cost_center_params["hours_contractor_invoices"].gsub('$','').gsub(',','')
      params["hours_contractor_invoices"] = valor6
      end
    end

    if params["materials_value"] != "nil" || params["materials_value"] != ""
      valor7 = cost_center_params["materials_value"].gsub('$','').gsub(',','')
      params["materials_value"] = valor7
    end

    if params["quotation_value"]  != "nil" || params["quotation_value"] != ""
      valor8 = cost_center_params["quotation_value"].gsub('$','').gsub(',','')
      params["quotation_value"] = valor8
    end

    if params["displacement_hours"]  != "nil" || params["displacement_hours"] != ""
      valor9 = cost_center_params["displacement_hours"].gsub('$','').gsub(',','')
      params["displacement_hours"] = valor9
    end

    if params["value_displacement_hours"]  != "nil" || params["value_displacement_hours"] != ""
      valo10 = cost_center_params["value_displacement_hours"].gsub('$','').gsub(',','')
      params["value_displacement_hours"] = valo10
    end

    @cost_center = CostCenter.create(cost_center_params)

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
      centro_show = CostCenter.all
    else
      centro_show = CostCenter.where(user_id: current_user.id)
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

      if cost_center_params["viatic_value"].class.to_s != "Integer" && cost_center_params["viatic_value"].class.to_s != "Float" && cost_center_params["viatic_value"].present?
        valor1 = cost_center_params["viatic_value"].gsub('$','').gsub(',','')
        params["viatic_value"] = valor1
      end

      if cost_center_params["quotation_value"].class.to_s != "Integer" && cost_center_params["quotation_value"].class.to_s != "Float" && cost_center_params["quotation_value"].present?
        valor2 = cost_center_params["quotation_value"].gsub('$','').gsub(',','')
        params["quotation_value"] = valor2
      end
      
      if cost_center_params["hour_real"].class.to_s != "Integer" && cost_center_params["hour_real"].class.to_s != "Float" && cost_center_params["hour_real"].present?
        valor3 = cost_center_params["hour_real"].gsub('$','').gsub(',','')
        params["hour_real"] = valor3
      end

      if cost_center_params["hour_cotizada"].class.to_s != "Integer" && cost_center_params["hour_cotizada"].class.to_s != "Float" && cost_center_params["hour_cotizada"].present?
        valor7 = cost_center_params["hour_cotizada"].gsub('$','').gsub(',','')
        params["hour_cotizada"] = valor7
      end
      
      if cost_center_params["hours_contractor_real"].class.to_s != "Integer" && cost_center_params["hours_contractor_real"].class.to_s != "Float" && cost_center_params["hours_contractor_real"].present?
        valor4 = cost_center_params["hours_contractor_real"].gsub('$','').gsub(',','')
        params["hours_contractor_real"] = valor4
      end

      if cost_center_params["hours_contractor_invoices"].class.to_s != "Integer" && cost_center_params["hours_contractor_invoices"].class.to_s != "Float" && cost_center_params["hours_contractor_invoices"].present?
        valor5 = cost_center_params["hours_contractor_invoices"].gsub('$','').gsub(',','')
        params["hours_contractor_invoices"] = valor5
      end

      if cost_center_params["materials_value"].class.to_s != "Integer" && cost_center_params["materials_value"].class.to_s != "Float" && cost_center_params["materials_value"].present?
        valor6 = cost_center_params["materials_value"].gsub('$','').gsub(',','')
        params["materials_value"] = valor6
      end

      if cost_center_params["displacement_hours"].class.to_s != "Integer" && cost_center_params["displacement_hours"].class.to_s != "Float" && cost_center_params["displacement_hours"].present?
        valor7 = cost_center_params["displacement_hours"].gsub('$','').gsub(',','')
        params["displacement_hours"] = valor7
      end

      if cost_center_params["value_displacement_hours"].class.to_s != "Integer" && cost_center_params["value_displacement_hours"].class.to_s != "Float" && cost_center_params["value_displacement_hours"].present?
        valor8 = cost_center_params["value_displacement_hours"].gsub('$','').gsub(',','')
        params["value_displacement_hours"] = valor8
      end

    end

    if @cost_center.update(cost_center_params) 
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
    def cost_center_params
      params.permit(:customer_id, :contact_id, :description, :start_date, :end_date, :quotation_number, :engineering_value, :viatic_value, :execution_state, :invoiced_state, :service_type, :code, :count, :eng_hours,:hour_cotizada, :hour_real, :quotation_value, :user_id, :work_force_contractor, :hours_contractor_invoices, :hours_contractor_real, :materials_value, :hours_contractor, :displacement_hours, :value_displacement_hours, :offset_value)
    end
end

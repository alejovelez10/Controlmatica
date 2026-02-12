module ApplicationHelper
  def controller_name_helper(controller, action)
    if controller == "providers" && action == "index"
      card = "<h1>" + " <i class='app-menu__icon fa fa-user'></i> Proveedores" + "</h1>" + "<p>" + "Gestiona tus proveedores" + "</p>"
    elsif controller == "customers" && action == "index"
      card = "<h1>" + " <i class='app-menu__icon fa fa-street-view'></i> Clientes " + "</h1>" + "<p>" + "Gestiona tus clientes" + "</p>"
    elsif controller == "parameterizations" && action == "index"
      card = "<h1>" + " <i class='app-menu__icon fa fa-layer-group'></i> Parametrizaciones " + "</h1>" + "<p>" + "Parametriza tu aplicación" + "</p>"
    elsif controller == "home" && action == "users"
      card = "<h1>" + " <i class='fas fa-handshake'></i> Usuarios " + "</h1>" + "<p>" + "Gestiona tus usuarios" + "</p>"
    elsif controller == "customer_reports" && action == "index"
      card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Reportes de clientes" + "</h1>" + "<p>" + "Crea y envia reportes a tus clientes" + "</p>"
    elsif controller == "cost_centers" && action == "index"
      card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Centro de Costos " + "</h1>" + "<p>" + "Gestiona tus centros de costos" + "</p>"
    elsif controller == "sales_orders" && action == "index"
      card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Ordenes de Compra " + "</h1>" + "<p>" + "Gestiona tus centros de costos" + "</p>"
    elsif controller == "register_edits" && action == "notifications"
      card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Registro de edicion " + "</h1>" + "<p>" + "Gestion de registros" + "</p>"
    elsif controller == "notification_alerts" && action == "index"
      card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Notificación de alertas" + "</h1>" + "<p>" + "Gestion de notificación de alertas" + "</p>"
    elsif controller == "cost_centers" && action == "show"
      card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Gestion del centro de costo " + "</h1>" + "<p>" + "Analiza como va tu proyecto" + "</p>"
    elsif controller == "materials" && action == "index"
      card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Materiales " + "</h1>" + "<p>" + "Gestiona tus materiales" + "</p>"
    elsif controller == "contractors" && action == "index"
      card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Gestion de Tableristas " + "</h1>" + "<p>" + "Gestiona tus tableristas" + "</p>"
    elsif controller == "reports" && action == "index"
      card = "<h1>" + " <i class='fas fa-university'></i> Reportes de servicios " + "</h1>" + "<p>" + "Gestiona los reportes de servicios" + "</p>"
    elsif controller == "employed_performance" && action == "show"
      card = "<h1>" + " <i class='app-menu__icon fa fa-street-view'></i> Informe de rendimiento" + "</h1>" + "<p>" + "" + "</p>"
    elsif controller == "alerts" && action == "index"
      card = "<h1>" + " <i class='fas fa-handshake'></i> Alertas " + "</h1>" + "<p>" + "Gestiona de requerimientos" + "</p>"
    elsif controller == "reports" && action == "controlmatica"
      card = "<h1>" + " <i class='fas fa-handshake'></i> Informes " + "</h1>" + "<p>" + "Gestiona de informes" + "</p>"
    elsif controller == "report_expenses" && action == "index"
      card = "<h1>" + " <i class='fas fa-handshake'></i> Control de gastos " + "</h1>" + "<p>" + "Gestiona de informes" + "</p>"
    elsif controller == "report_expenses" && action == "indicators_expenses"
      card = "<h1>" + " <i class='fas fa-handshake'></i> Informe de control de gastos " + "</h1>" + "<p>" + "Gestiona de informes" + "</p>"
    elsif controller == "shifts" && action == "index"
      card = "<h1>" + " <i class='fas fa-handshake'></i> Turnos " + "</h1>" + "<p>" + "Gestiona de turnos" + "</p>"
    elsif controller == "shifts" && action == "calendar"
      card = "<h1>" + " <i class='fas fa-handshake'></i> Vista de los turnos en calendario " + "</h1>" + "<p>" + "Gestiona de turnos" + "</p>"
    elsif controller == "expense_ratios" && action == "index"
      card = "<h1>" + " <i class='fas fa-handshake'></i> Relacion de gastos " + "</h1>" + "<p>" + "Gestiona de informes" + "</p>"
    elsif controller == "report_expense_options" && action == "index"
      card = "<h1>" + " <i class='fas fa-handshake'></i>  Tipos de Gastos " + "</h1>" + "<p>" + "Gestiona de tipos" + "</p>"
    elsif controller == "commissions" && action == "index"
      card = "<h1>" + " <i class='fas fa-handshake'></i>  Comisiones " + "</h1>" + "<p>" + "Gestion de comisiónes" + "</p>"
    elsif controller == "commission_relations" && action == "index"
      card = "<h1>" + " <i class='fas fa-handshake'></i>  Relacion de comisiones " + "</h1>" + "<p>" + "Gestion de relacion de comisiones" + "</p>"
    else
      "Proyectos"
    end
  end

  def breadcrumb_actions(controller, action)
    if controller == "views" && action == "index"
      card = "<li class='breadcrumb-item'> <a href='/users/index'>Index</a></li>"
    elsif controller == "rols" && action == "index"
      card = "<li class='breadcrumb-item'> <a href='/rols'>Index</a></li>"
    elsif controller == "module_controls" && action == "index"
      card = "<li class='breadcrumb-item'> <a href='/module_controls'>Index</a></li>"
    elsif controller == "home" && action == "dasboard"
      card = "<li class='breadcrumb-item'> <a href='/dasboard'>Home</a></li>"
    elsif controller == "module_controls" && action == "show"
      card = "<li class='breadcrumb-item'> <a href='/module_controls'>Index</a></li> <li class='breadcrumb-item'> <a href='/module_controls/'>show</a></li>"
    elsif controller == "agreements"
      card = "<li class='breadcrumb-item'> <a href='/agreements'>Index</a></li>"
    elsif controller == "partners"
      card = "<li class='breadcrumb-item'> <a href='/partners'>Index</a></li>"
    elsif controller == "registrations" && action == "edit"
      card = "<li class='breadcrumb-item'> <a href='/users/edit'>Editar</a></li>"
    elsif controller == "bankings"
      card = "<li class='breadcrumb-item'> <a href='/users/edit'>Informacion</a></li>"
    elsif controller == "home" && action == "index"
      card = "<li class='breadcrumb-item'> <a href='/'>Index</a></li>"
    elsif controller == "report_expenses" && action == "index"
      card = "<li class='breadcrumb-item'> <a href='/report_expenses'>Index</a></li>"
    elsif controller == "shifts" && action == "index"
      card = "<li class='breadcrumb-item'> <a href='/shifts' data-turbolinks='false'>Index</a></li> <li class='breadcrumb-item'> <a href='/shifts/calendar/ALL' data-turbolinks='false' >Vista calendario</a></li>"
    elsif controller == "shifts" && action == "calendar"
      card = "<li class='breadcrumb-item'> <a href='/shifts' data-turbolinks='false'>Index</a></li> <li class='breadcrumb-item'> <a href='/shifts/calendar/#{params[:from]}' data-turbolinks='false'>Vista calendario</a></li>"
    else
      ""
    end
  end

  def select_documento
    [
      ["Cédula de Ciudadanía", "Cédula de Ciudadanía"],
      ["Tarjeta de Identidad", "Tarjeta de Identidad"],
      ["Registro Civil de Nacimiento", "Registro Civil de Nacimiento"],
      ["Cédula de Extranjeria", "Cedula de Extranjeria"],
      ["Pasaporte", "Pasaporte"],
      ["Menor sin Identificación", "Menor sin Identificación"],
      ["Adulto sin Identificación", "Adulto sin Identificación"],
      ["Carnet Diplomático", "Carnet Diplomático"],

    ]
  end

  def get_rol_user
    [
      ["Super administrador", "Super administrador"],
      ["Comercial", "Comercial"],
      ["Ingeniero", "Ingeniero"],
    ]
  end

  def get_state_report
    estado = { "Sin Aprobar" => "false", "Aprobado" => "true" }
    return estado
  end

  def get_state_eje
    [
      ["FINALIZADO", "FINALIZADO"],
      ["PENDIENTE", "PENDIENTE"],
      ["EJECUCIÓN", "EJECUCIÓN"],
    ]
  end

  def get_state_facturacion
    [
      ["FACTURADO", "FACTURADO"],
      ["LEGALIZADO", "LEGALIZADO"],
      ["PENDIENTE DE ORDEN DE COMPRA", "PENDIENTE DE ORDEN DE COMPRA"],
    ]
  end

  def get_customer_report
    if current_user.rol_user == "Super administrador" || current_user.rol_user == "Comercial"
      CustomerReport.all
    elsif current_user.rol_user == "Ingeniero"
      CustomerReport.where(user_id: current_user.id)
    end
  end

  def get_current_user
    current_user
  end

  def number_to_currency_br(number)
    number_to_currency(number, :unit => "", :delimiter => ".")
  end

  def get_customer
    Customer.all
  end

  def get_contact
    Contact.all
  end

  def get_reports
    Report.all
  end

  def get_rol
    Rol.all
  end

  def get_cost_center
    CostCenter.where("start_date >= ?", Date.new(2023, 1, 1))
  end

  def get_provider
    Provider.all
  end

  def get_users
    User.all
  end

  def get_users_rol
    users = User.all
    users.collect do |user|
      {
        :id => user.id,
        :names => user.names,
        :rol => user.rol.name
      }
    end
  end

  def get_users_json
    users = User.joins(:rol).where("rols.name = ? OR rols.name = ?", "Administrador", "Comercial")
    users.collect do |user|
      {
        :id => user.id,
        :name => user.names,
      }
    end
  end

  def get_cost_center_select
    cost_centers = CostCenter.where("service_type = ? OR service_type = ?", "SERVICIO", "PROYECTO").where("start_date >= ?", Date.new(2023, 1, 1))
    cost_centers.collect do |cost_center|
      {
        :value => cost_center.id,
        :label => cost_center.code,
      }
    end
  end  

  def get_users_select
    users = User.all
    users.collect do |user|
      {
        :value => user.id,
        :label => user.names,
      }
    end
  end

  def get_center_expenses
    CostCenter.where.not(execution_state: "FINALIZADO").where.not(service_type: "VENTA").where("start_date >= ?", Date.new(2023, 1, 1))
  end

  def get_center_materials
    CostCenter.where.not(sales_state: "CERRADO").where.not(service_type: "SERVICIO").where("start_date >= ?", Date.new(2023, 1, 1))
  end

  def get_center_tableristas
    CostCenter.where(service_type: "PROYECTO").where.not(execution_state: "FINALIZADO").where("start_date >= ?", Date.new(2023, 1, 1))
  end

  def get_register_edit
    RegisterEdit.where(state: "pending").order(created_at: :desc).limit(100)
  end

  def get_notification_alert
    NotificationAlert.includes(:cost_center).where(state: false).order(date_update: :desc).limit(100)
  end

  def get_date(fecha)
    if fecha != nil
      ds = fecha.strftime("%w") #Dia de la semana
      y = fecha.strftime("%Y") #Año
      dm = fecha.strftime("%d") #Dia del mes
      m = fecha.strftime("%m") # Mes del Año
      meses = { "01" => "Enero", "02" => "Febrero", "03" => "Marzo", "04" => "Abril", "05" => "Mayo", "06" => "Junio", "07" => "Julio", "08" => "Agosto", "09" => "Septiembre", "10" => "Octubre", "11" => "Noviembre", "12" => "Diciembre" }
      dias = { "7" => "Domingo", "1" => "Lunes", "2" => "Martes", "3" => "Miercoles", "4" => "Jueves", "5" => "Viernes", "6" => "Sabado" }
      return meses[m] + " " + dm + " del " + y
      #dias[ds] + ", " +
    end
  end

  # Carga todos los permisos del menú en 1 sola query (reemplaza ~50 queries individuales)
  def menu_permissions
    @_menu_permissions ||= begin
      perms = current_user.rol.accion_modules
        .joins(:module_control)
        .pluck("module_controls.name", "accion_modules.name")
      hash = {}
      perms.each do |mod_name, action_name|
        hash[mod_name] ||= []
        hash[mod_name] << action_name
      end
      hash
    end
  end

  def has_menu_permission?(module_name, action_name = "Ingreso al modulo")
    perms = menu_permissions[module_name]
    perms && perms.include?(action_name)
  end

  def authorization_report_contractors
    has_menu_permission?("Informe de rendimiento tableristas")
  end

  def authorization_providers
    has_menu_permission?("Proveedores")
  end

  def authorization_customers
    has_menu_permission?("Clientes")
  end

  def authorization_commissions
    has_menu_permission?("Comisiones")
  end

  def authorization_commission_relations
    has_menu_permission?("Relación de comisiones")
  end

  def authorization_parameterizations
    has_menu_permission?("Parametrizaciones")
  end

  def authorization_users
    has_menu_permission?("Usuarios")
  end

  def authorization_rols
    has_menu_permission?("Roles")
  end

  def authorization_modules
    has_menu_permission?("Modulos y Acciones")
  end

  def authorization_cost_center
    has_menu_permission?("Centro de Costos")
  end

  def authorization_sales_orders
    has_menu_permission?("Ordenes de Compra")
  end

  def authorization_report
    has_menu_permission?("Reportes de servicios")
  end

  def authorization_customer_reports
    has_menu_permission?("Reportes de clientes")
  end

  def authorization_employed_performance
    has_menu_permission?("Informe de rendimiento")
  end

  def authorization_contractors
    has_menu_permission?("Tableristas")
  end

  def authorization_materials
    has_menu_permission?("Materiales")
  end

  def authorization_alerts
    has_menu_permission?("Notificación de alertas")
  end

  def authorization_notifications
    has_menu_permission?("Registro de edicion")
  end

  def authorization_tablero
    has_menu_permission?("Tablero de Ingenieros", "Ver tablero")
  end

  def authorization_turnos
    has_menu_permission?("Turnos", "Ver todos")
  end

  def authorization_tablero_user
    has_menu_permission?("Tablero de Ingenieros", "Ver todos")
  end

  def authorization_config
    if authorization_providers || authorization_customers || authorization_parameterizations || authorization_users || authorization_rols || authorization_modules || current_user.rol.name == "Administrador" || authorization_report_expense_options
      true
    end
  end

  def authorization_report_expenses
    has_menu_permission?("Gastos")
  end

  def authorization_expense_ratios
    has_menu_permission?("Relación de gastos")
  end

  def authorization_report_expense_options
    has_menu_permission?("Tipos de Gastos")
  end

  def get_state_center(accion)
    if (accion.execution_state == "FINALIZADO" && accion.invoiced_state == "FACTURADO")
      return ""
    elsif (accion.execution_state == "FINALIZADO" && accion.invoiced_state == "PENDIENTE DE COTIZACION")
      return ""
    elsif (accion.execution_state == "EJECUCION" && accion.invoiced_state == "PENDIENTE DE ORDEN DE COMPRA")
      return "Finalizar"
    elsif (accion.execution_state == "FINALIZADO" && accion.invoiced_state == "LEGALIZADO")
      return ""
    elsif (accion.execution_state == "EJECUCION" && accion.invoiced_state == "PENDIENTE DE COTIZACION")
      return "Finalizar"
    elsif (accion.execution_state == "FINALIZADO" && accion.invoiced_state == "POR FACTURAR")
      return ""
    end
  end

  def page_entries_info(collection, options = {})
    entry_name = options[:entry_name] || (collection.empty? ? "Roles" :
      collection.first.class.name.split("::").last.titleize)
    if collection.total_pages < 2
      case collection.size
      when 0; "No hay #{entry_name.pluralize} registrados"
      else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]       end
    else
      %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]
    end
  end

  def page_repor_info(collection, options = {})
    entry_name = options[:entry_name] || (collection.empty? ? "Reportes" :
      collection.first.class.name.split("::").last.titleize)
    if collection.total_pages < 2
      case collection.size
      when 0; "No hay #{entry_name.pluralize} registrados"
      else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]       end
    else
      %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]
    end
  end

  def page_providers_info(collection, options = {})
    entry_name = options[:entry_name] || (collection.empty? ? "Proveedores" :
      collection.first.class.name.split("::").last.titleize)
    if collection.total_pages < 2
      case collection.size
      when 0; "No hay #{entry_name.pluralize} Creados"
      else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]       end
    else
      %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]
    end
  end

  def page_customers_info(collection, options = {})
    entry_name = options[:entry_name] || (collection.empty? ? "Clientes" :
      collection.first.class.name.split("::").last.titleize)
    if collection.total_pages < 2
      case collection.size
      when 0; "No hay #{entry_name.pluralize} registrados"
      else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]       end
    else
      %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]
    end
  end

  def page_cost_centers_info(collection, options = {})
    entry_name = options[:entry_name] || (collection.empty? ? "Centro de Costos" :
      collection.first.class.name.split("::").last.titleize)
    if collection.total_pages < 2
      case collection.size
      when 0; "No hay #{entry_name.pluralize} registrados"
      else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]       end
    else
      %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]
    end
  end

  def page_parameterization_info(collection, options = {})
    entry_name = options[:entry_name] || (collection.empty? ? "Parametrizacion" :
      collection.first.class.name.split("::").last.titleize)
    if collection.total_pages < 2
      case collection.size
      when 0; "No hay #{entry_name.pluralize} registrados"
      else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]       end
    else
      %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]
    end
  end

  def page_customer_reports_info(collection, options = {})
    entry_name = options[:entry_name] || (collection.empty? ? "Informes de Clientes" :
      collection.first.class.name.split("::").last.titleize)
    if collection.total_pages < 2
      case collection.size
      when 0; "No hay #{entry_name.pluralize} registrados"
      else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]       end
    else
      %{Mostrando %d de %d #{entry_name.pluralize}} % [
        collection.length,
        collection.total_entries,
      ]
    end
  end

  def recalculate_cost_center(cost, module_is = "nt")
    @cost_center = CostCenter.find(cost)
    ing_horas_eje = @cost_center.reports.sum(:working_time)
    ing_horas_porcentaje = @cost_center.eng_hours > 0 ? (((ing_horas_eje.to_f / @cost_center.eng_hours)) * 100).round(1) : 0

    #desplazamiento
    cotizado_desplazamiento = @cost_center.value_displacement_hours * @cost_center.displacement_hours
    ejecutado_desplazamiento = @cost_center.reports.sum(:value_displacement_hours)
    desp_horas_eje = @cost_center.reports.sum(:displacement_hours)
    desp_horas_porcentaje = @cost_center.displacement_hours > 0 ? (((desp_horas_eje.to_f / @cost_center.displacement_hours)) * 100).round(1) : "N/A"

    #ingenieria costos
    ing_costo_cotizado = (@cost_center.hour_cotizada * @cost_center.eng_hours).round(1) + cotizado_desplazamiento
    ing_costo_real = (@cost_center.hour_real * ing_horas_eje).round(1) + ejecutado_desplazamiento
    ing_costo_porcentaje = ing_costo_cotizado > 0 ? (((1 - (ing_costo_real.to_f / ing_costo_cotizado)) * 100)).round(1) : 0

    #contractor
    cont_horas_eje = @cost_center.contractors.sum(:hours)
    puts cont_horas_eje
    puts "holaaaaaa"
    cont_horas_porcentaje = @cost_center.hours_contractor > 0 ? (((cont_horas_eje.to_f / @cost_center.hours_contractor)) * 100).round(1) : 0
    puts cont_horas_eje.to_f / @cost_center.hours_contractor
    puts cont_horas_porcentaje
    cont_costo_cotizado = (@cost_center.hours_contractor_invoices * @cost_center.hours_contractor).round(1)
    cont_costo_real = (@cost_center.hours_contractor_real * cont_horas_eje).round(1)
    cont_costo_porcentaje = cont_costo_cotizado > 0 ? (((1 - (cont_costo_real.to_f / cont_costo_cotizado)) * 100)).round(1) : 0

    mat_costo_real = @cost_center.materials.sum(:amount)
    mat_costo_porcentaje = (@cost_center.materials_value != nil ? @cost_center.materials_value : 0) > 0 ? ((1 - (mat_costo_real.to_f / @cost_center.materials_value)) * 100).round(1) : 0

    viat_costo_real = @cost_center.reports.sum(:viatic_value) + @cost_center.report_expenses.sum(:invoice_value)
    viat_costo_porcentaje = @cost_center.viatic_value > 0 ? ((viat_costo_real.to_f / @cost_center.viatic_value) * 100).round(1) : 0

    fact_real = @cost_center.customer_invoices.sum(:invoice_value)
    fact_porcentaje = @cost_center.quotation_value > 0 ? ((fact_real.to_f / @cost_center.quotation_value) * 100).round(1) : 0

    gastos = ing_costo_real + cont_costo_real + mat_costo_real + viat_costo_real
    aiu = fact_real - gastos
    aiu_percent = fact_real > 0 ? (((aiu.to_f / fact_real.to_f)) * 100).round(1) : 0

    aiu_real = @cost_center.quotation_value - gastos
    aiu_percent_real = @cost_center.quotation_value > 0 ? (((aiu_real.to_f / @cost_center.quotation_value.to_f)) * 100).round(1) : 0

    @cost_center.update(
      ing_horas_eje: ing_horas_eje,
      ing_horas_porcentaje: ing_horas_porcentaje,
      desp_horas_eje: desp_horas_eje,
      desp_horas_porcentaje: desp_horas_porcentaje,
      ing_costo_cotizado: ing_costo_cotizado,
      ing_costo_real: ing_costo_real,
      ing_costo_porcentaje: ing_costo_porcentaje,
      cont_horas_eje: cont_horas_eje,
      cont_horas_porcentaje: cont_horas_porcentaje,
      cont_costo_cotizado: cont_costo_cotizado,
      cont_costo_real: cont_costo_real,
      cont_costo_porcentaje: cont_costo_porcentaje,
      mat_costo_real: mat_costo_real,
      mat_costo_porcentaje: mat_costo_porcentaje,
      viat_costo_real: viat_costo_real,
      viat_costo_porcentaje: viat_costo_porcentaje,
      fact_real: fact_real,
      fact_porcentaje: fact_porcentaje,
      aiu: aiu,
      aiu_percent: aiu_percent,
      aiu_real: aiu_real,
      aiu_percent_real: aiu_percent_real,
      total_expenses: gastos,
    )

    alert = Alert.last

    if module_is == "reportes"
      if @cost_center.ing_costo_porcentaje < alert.ing_costo_med
        NotificationAlert.create(cost_center_id: @cost_center.id, user_id: current_user.id, module: "Ingenieria", date_update: Time.now, description: "El margen esperado esta por debajo de lo minimo ", expected: alert.ing_costo_med, real: @cost_center.ing_costo_porcentaje)
        #AlertMailer.send_alert(@cost_center.ing_costo_porcentaje, alert.ing_costo_med ,"El margen esperado esta por debajo de lo minimo esperado").deliver
      end
      if @cost_center.viat_costo_porcentaje > alert.via_med
        NotificationAlert.create(cost_center_id: @cost_center.id, expected: alert.via_med, real: @cost_center.viat_costo_porcentaje, user_id: current_user.id, module: "Viaticos", date_update: Time.now, description: "El porcentaje de avance de los viaticos esta por encima de del tope")
        #AlertMailer.send_alert(@cost_center.viat_costo_porcentaje, alert.via_med ,"El porcentaje de avance de los viaticos esta por encima de del tope").deliver
      end
      if @cost_center.desp_horas_porcentaje > alert.desp_med
        NotificationAlert.create(cost_center_id: @cost_center.id, expected: alert.desp_med, real: @cost_center.desp_horas_porcentaje, user_id: current_user.id, module: "Desplazamiento", date_update: Time.now, description: "El porcentaje de avance desplazamiento esta por encima de del tope")
        #AlertMailer.send_alert(@cost_center.desp_horas_porcentaje, alert.desp_med ,"El porcentaje de avance desplazamiento esta por encima de del tope").deliver
      end
    elsif module_is == "contractor"
      if @cost_center.cont_costo_porcentaje < alert.tab_costo_med
        NotificationAlert.create(cost_center_id: @cost_center.id, expected: alert.tab_costo_med, real: @cost_center.cont_costo_porcentaje, user_id: current_user.id, module: "Tableristas", date_update: Time.now, description: "El margen esperado esta por debajo de lo minimo")
        #AlertMailer.send_alert(@cost_center.cont_costo_porcentaje, alert.tab_costo_med ,"El margen esperado esta por debajo de lo minimo esperado").deliver
      end
    elsif module_is == "materiales"
      if @cost_center.mat_costo_porcentaje < alert.mat_med
        NotificationAlert.create(cost_center_id: @cost_center.id, expected: alert.mat_med, real: @cost_center.mat_costo_porcentaje, user_id: current_user.id, module: "Materiales", date_update: Time.now, description: "El margen esperado esta por debajo de lo minimo")
        #AlertMailer.send_alert(@cost_center.mat_costo_porcentaje, alert.mat_med ,"El margen esperado esta por debajo de lo minimo esperado").deliver
      end
    end

    puts "hola"
  end
end

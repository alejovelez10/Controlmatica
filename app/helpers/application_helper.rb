module ApplicationHelper

	def controller_name_helper(controller,action)
        if controller == "providers" && action == "index"
            card = "<h1>" + " <i class='app-menu__icon fa fa-user'></i> Proveedores" + "</h1>" + "<p>" + "Gestiona a todos los usuarios" + "</p>"
 
        elsif controller == "customers" && action == "index"
            card = "<h1>" + " <i class='app-menu__icon fa fa-street-view'></i> Clientes " + "</h1>" + "<p>" + "Crea los roles corporativos" + "</p>"

        elsif controller == "parameterizations" && action = "index"
            card = "<h1>" + " <i class='app-menu__icon fa fa-layer-group'></i> Parametrizaciones " + "</h1>" + "<p>" + "Crea y lleva control de los modulos" + "</p>"
            
        elsif controller == "home"  && action = "users"
            card = "<h1>" + " <i class='fas fa-handshake'></i> Usuarios " + "</h1>" + "<p>" + "Crea y lleva control de los modulos" + "</p>"

        elsif controller == "customer_reports" && action == "index"
            card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Reportes de clientes" + "</h1>" + "<p>" + "Crea y lleva control de los modulos" + "</p>"

        elsif controller == "cost_centers"  && action == "index"
            card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Centro de Costos " + "</h1>" + "<p>" + "añde mas socios" + "</p>"

        elsif controller == "cost_centers" && action == "show"
			card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Gestion del centro de costo " + "</h1>" + "<p>" + "añde ordenes de compra" + "</p>"
		
		
		
		elsif controller == "cost_centers" && action == "materials"
			card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Gestion del centro de costo " + "</h1>" + "<p>" + "añde materiales" + "</p>"

		elsif controller == "cost_centers" && action == "contractors"
			card = "<h1>" + " <i class='app-menu__icon fa fa-chart-bar'></i> Gestion del centro de costo " + "</h1>" + "<p>" + "añde contratistas" + "</p>"

			

        elsif controller == "reports" && action == "index"
            card = "<h1>" + " <i class='fas fa-university'></i> Reportes " + "</h1>" + "<p>" + "añde mas socios" + "</p>"

        elsif controller == "employed_performance" && action == "show"
            card = "<h1>" + " <i class='app-menu__icon fa fa-street-view'></i> Informe de rendimiento" + "</h1>" + "<p>" + "Crea los roles corporativos" + "</p>"
        


        else
            "Proyectos"
        end
 
    end
    

    def breadcrumb_actions(controller,action)
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

        
        else
            ""
        end
    end

	def select_documento
		[
	      ['Cédula de Ciudadanía', 'Cédula de Ciudadanía'],
	      ['Tarjeta de Identidad', 'Tarjeta de Identidad'],
	      ['Registro Civil de Nacimiento', 'Registro Civil de Nacimiento'],
	      ['Cédula de Extranjeria', 'Cedula de Extranjeria'],
	      ['Pasaporte', 'Pasaporte'],
	      ['Menor sin Identificación', 'Menor sin Identificación'],
	      ['Adulto sin Identificación', 'Adulto sin Identificación'],
	      ['Carnet Diplomático', 'Carnet Diplomático']
	     
	  	]
	end

	def get_rol_user
		[
	      ['Super administrador', 'Super administrador'],
	      ['Comercial', 'Comercial'],
	      ['Ingeniero', 'Ingeniero']
		]
	end


	def get_state_report
		estado = {"Sin Aprobar" => "false" , "Aprobado" => "true"}
	    return estado
	end


	def get_state_eje
		[
	      ['FINALIZADO', 'FINALIZADO'],
	      ['PENDIENTE', 'PENDIENTE'],
	      ['EJECUCIÓN', 'EJECUCIÓN']
		]
	end

	def get_state_facturacion
		[
	      ['FACTURADO', 'FACTURADO'],
	      ['LEGALIZADO', 'LEGALIZADO'],
	      ['PENDIENTE DE ORDEN DE COMPRA', 'PENDIENTE DE ORDEN DE COMPRA']
		]
	end

	def get_customer_report
		if current_user.rol_user == "Super administrador" || current_user.rol_user == "Comercial"
	     CustomerReport.all
	    elsif current_user.rol_user == "Ingeniero"
	      CustomerReport.where(user_id: current_user.id)
	    end
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
		CostCenter.all
	end

	def get_provider
		Provider.all
	end
	

	def get_date(fecha)
   
		if fecha != nil
		    ds = fecha.strftime("%w") #Dia de la semana
		    y = fecha.strftime("%Y") #Año
		    dm = fecha.strftime("%d") #Dia del mes
		    m = fecha.strftime("%m") # Mes del Año
		    meses = {"01" => "Enero", "02" => "Febrero","03"=>"Marzo","04" => "Abril", "05" => "Mayo","06"=> "Junio" ,"07"=> "Julio", "08" => "Agosto", "09"=> "Septiembre" ,"10"=> "Octubre","11" => "Noviembre" ,"12" => "Diciembre" }
		    dias = {"7" => "Domingo", "1" => "Lunes","2"=>"Martes","3" => "Miercoles", "4" => "Jueves","5"=> "Viernes" ,"6" =>"Sabado"}
		    return  meses[m] + " " + dm + " del " + y 
		#dias[ds] + ", " +
		end 
	end

	def authorization_providers
        providers = ModuleControl.find_by_name("Proveedores")
        current_user.rol.accion_modules.where(module_control_id: providers.id).where(name: "Ingreso al modulo").exists?
	end


	def authorization_customers
        customers = ModuleControl.find_by_name("Clientes")
        current_user.rol.accion_modules.where(module_control_id: customers.id).where(name: "Ingreso al modulo").exists?
	end


	def authorization_parameterizations
        parameterizations = ModuleControl.find_by_name("Parametrizaciones")
        current_user.rol.accion_modules.where(module_control_id: parameterizations.id).where(name: "Ingreso al modulo").exists?
	end


    def authorization_users
        usuarios = ModuleControl.find_by_name("Usuarios")
        current_user.rol.accion_modules.where(module_control_id: usuarios.id).where(name: "Ingreso al modulo").exists?
    end

    def authorization_rols
        roles = ModuleControl.find_by_name("Roles")
        current_user.rol.accion_modules.where(module_control_id: roles.id).where(name: "Ingreso al modulo").exists?
    end

    def authorization_modules
        modules = ModuleControl.find_by_name("Modulos y Acciones")
        current_user.rol.accion_modules.where(module_control_id: modules.id).where(name: "Ingreso al modulo").exists?
	end

	def authorization_cost_center
        cost_center = ModuleControl.find_by_name("Centro de Costos")
        current_user.rol.accion_modules.where(module_control_id: cost_center.id).where(name: "Ingreso al modulo").exists?
	end

	def authorization_report
        report = ModuleControl.find_by_name("Reportes de servicios")
        current_user.rol.accion_modules.where(module_control_id: report.id).where(name: "Ingreso al modulo").exists?
	end


	def authorization_customer_reports
        customer_reports = ModuleControl.find_by_name("Reportes de clientes")
        current_user.rol.accion_modules.where(module_control_id: customer_reports.id).where(name: "Ingreso al modulo").exists?
	end

	def authorization_employed_performance
        employed_performance = ModuleControl.find_by_name("Informe de rendimiento")
        current_user.rol.accion_modules.where(module_control_id: employed_performance.id).where(name: "Ingreso al modulo").exists?
	end


	def authorization_config
		authorization_providers && authorization_customers && authorization_parameterizations && authorization_users && authorization_rols
	end
	





	def page_entries_info(collection, options = {})
	  entry_name = options[:entry_name] || (collection.empty?? 'Roles' :
	      collection.first.class.name.split('::').last.titleize)
	  if collection.total_pages < 2
	    case collection.size
	    when 0; "No hay #{entry_name.pluralize} registrados"
	    else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	    end
	  else
	    %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	  end
	end

	def page_repor_info(collection, options = {})
	  entry_name = options[:entry_name] || (collection.empty?? 'Reportes' :
	      collection.first.class.name.split('::').last.titleize)
	  if collection.total_pages < 2
	    case collection.size
	    when 0; "No hay #{entry_name.pluralize} registrados"
	    else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	    end
	  else
	    %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	  end
	end

	def page_providers_info(collection, options = {})
	  entry_name = options[:entry_name] || (collection.empty?? 'Proveedores' :
	      collection.first.class.name.split('::').last.titleize)
	  if collection.total_pages < 2
	    case collection.size
	    when 0; "No hay #{entry_name.pluralize} Creados"
	    else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	    end
	  else
	    %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	  end
	end

	def page_customers_info(collection, options = {})
	  entry_name = options[:entry_name] || (collection.empty?? 'Clientes' :
	      collection.first.class.name.split('::').last.titleize)
	  if collection.total_pages < 2
	    case collection.size
	    when 0; "No hay #{entry_name.pluralize} registrados"
	    else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	    end
	  else
	    %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	  end
	end


	def page_cost_centers_info(collection, options = {})
	  entry_name = options[:entry_name] || (collection.empty?? 'Centro de Costos' :
	      collection.first.class.name.split('::').last.titleize)
	  if collection.total_pages < 2
	    case collection.size
	    when 0; "No hay #{entry_name.pluralize} registrados"
	    else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	    end
	  else
	    %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	  end
	end

	def page_parameterization_info(collection, options = {})
	  entry_name = options[:entry_name] || (collection.empty? ? 'Parametrizacion' :
	      collection.first.class.name.split('::').last.titleize)
	  if collection.total_pages < 2
	    case collection.size
	    when 0; "No hay #{entry_name.pluralize} registrados"
	    else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	    end
	  else
	    %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	  end
	end

	def page_customer_reports_info(collection, options = {})
	  entry_name = options[:entry_name] || (collection.empty? ? 'Informes de Clientes' :
	      collection.first.class.name.split('::').last.titleize)
	  if collection.total_pages < 2
	    case collection.size
	    when 0; "No hay #{entry_name.pluralize} registrados"
	    else; %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	    end
	  else
	    %{Mostrando %d de %d #{entry_name.pluralize}} % [
	      collection.length ,
	      collection.total_entries
	    ]
	  end
	end

end


module ApplicationHelper

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


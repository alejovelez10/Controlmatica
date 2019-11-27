class ApplicationController < ActionController::Base
before_action :configure_permitted_parameters, if: :devise_controller?

  protected

  def configure_permitted_parameters
    [:account_update,:sign_up].each do |metodo|
    devise_parameter_sanitizer.permit(metodo, keys: [:names, :birthday, :last_names, :avatar, :rol_id, :document_type, :number_document, :rol_user])
   end
  end

  layout :layout_for_selection
	protected
	def layout_for_selection
		if controller_name == 'sessions'  || controller_name == 'passwords' 
		      'application'
		elsif controller_name == 'registrations'

		    if action_name == "new" || action_name == "create"
		            'application'
		    else
		     'user'
		    end
		 else
		  'user'
		end
    end

  def after_sign_in_path_for(resource)
	reports = ModuleControl.find_by_name("Reportes de servicios")
    estado = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Ingreso al modulo").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)
 
	if user_signed_in?
		if validate
			reports_path
		else
			root_path
		end
	else
	    root_path            
	end 
  end

end

class ApplicationController < ActionController::Base
  before_action :configure_permitted_parameters, if: :devise_controller?
  before_action :set_current_user

  protected

  def configure_permitted_parameters
    [:account_update, :sign_up].each do |metodo|
      devise_parameter_sanitizer.permit(metodo, keys: [:names, :birthday, :last_names, :avatar, :rol_id, :document_type, :number_document, :rol_user])
    end
  end

  layout :layout_for_selection

  protected

  def layout_for_selection
    if controller_name == "sessions" || controller_name == "passwords"
      "application"
    elsif controller_name == "registrations"
      if action_name == "new" || action_name == "create"
        "application"
      else
        "user"
      end
    else
      "user"
    end
  end

  def set_current_user
    User.current = current_user
  end

  def after_sign_in_path_for(resource)
    reports = ModuleControl.find_by_name("Reportes de servicios")
    tablero = ModuleControl.find_by_name("Tablero de Ingenieros")
    estado_tablero = current_user.rol.accion_modules.where(module_control_id: tablero.id).where(name: "Ver tablero").exists?
    estado = current_user.rol.accion_modules.where(module_control_id: reports.id).where(name: "Ingreso al modulo").exists?
    validate = (current_user.rol.name == "Administrador" ? true : estado)

    if user_signed_in?
      if estado_tablero
        dashboard_ing_path
      else
        if validate
          reports_path
        else
          root_path
        end
      end
    else
      root_path
    end
  end
end

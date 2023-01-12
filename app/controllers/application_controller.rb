class ApplicationController < ActionController::Base
  before_action :configure_permitted_parameters, if: :devise_controller?
  before_action :set_current_user
  before_action :set_user
  require 'microsoft_graph_auth'
  require 'oauth2'

  def save_in_session(auth_hash)
      # Save the token info
      session[:graph_token_hash] = auth_hash[:credentials]
      # Save the user's display name
      session[:user_name] = auth_hash.dig(:extra, :raw_info, :displayName)
      # Save the user's email address
      # Use the mail field first. If that's empty, fall back on
      # userPrincipalName
      session[:user_email] = auth_hash.dig(:extra, :raw_info, :mail) ||
                             auth_hash.dig(:extra, :raw_info, :userPrincipalName)
      # Save the user's time zone
      session[:user_timezone] = auth_hash.dig(:extra, :raw_info, :mailboxSettings, :timeZone)
  end

  def refresh_tokens(token_hash)
      oauth_strategy = OmniAuth::Strategies::MicrosoftGraphAuth.new(
        nil, ENV['AZURE_APP_ID'], ENV['AZURE_APP_SECRET']
      )
    
      token = OAuth2::AccessToken.new(
        oauth_strategy.client, token_hash[:token],
        :refresh_token => token_hash[:refresh_token]
      )
    
      # Refresh the tokens
      new_tokens = token.refresh!.to_hash.slice(:access_token, :refresh_token, :expires_at)
    
      # Rename token key
      new_tokens[:token] = new_tokens.delete :access_token
    
      # Store the new hash
      session[:graph_token_hash] = new_tokens
  end

  def user_name
      session[:user_name]
  end
    
  def user_email
      session[:user_email]
  end
    
  def user_timezone
      session[:user_timezone]
  end
    
  def access_token
      token_hash = session[:graph_token_hash]
    
      # Get the expiry time - 5 minutes
      expiry = Time.at(token_hash[:expires_at] - 300)
    
      if Time.now > expiry
        # Token expired, refresh
        new_hash = refresh_tokens token_hash
        new_hash[:token]
      else
        token_hash[:token]
      end
  end

  def set_user
      @user_name = user_name
      @user_email = user_email
  end

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
        dashboard_ing_path + "?tab=home"
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

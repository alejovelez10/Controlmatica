# frozen_string_literal: true

class Users::RegistrationsController < Devise::RegistrationsController
  respond_to :html, :js, :only => [:new, :update, :create]

  # before_action :configure_sign_up_params, only: [:create]
  # before_action :configure_account_update_params, only: [:update]

  # GET /resource/sign_up
  # def new
  #   super
  # end

  # POST /resource
  # def create
  #   super
  # end

  # GET /resource/edit
  def edit
      puts "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  end

  def user_edit
    @user = User.find(params[:id])
    
  end

  def update_user
    @user = User.find(params[:id])
    if @user.update(user_update_params)
      redirect_to users_path
      flash[:success] = "¡El registro de #{@user.names} fue actualizado con éxito!"
      else
        redirect_to user_edit_path(@user.id)
    end
  end

  def delete_user
    @user = User.find(params[:id])
    if @user.destroy
      flash[:delete] = "¡El registro de #{@user.names} fue eliminado con éxito!"
        redirect_to users_path
    end
  end

  # PUT /resource
  # def update
  #   super
  # end

  # DELETE /resource
  # def destroy
  #   super
  # end
  def create_user
    @users = User.create(user_params)
    if @users.save
        redirect_to user_path
        flash[:success] = "El Registro de creo con"
      else 
        puts "noguardaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        flash[:error] = "El Registro No se puedo crear"
    end
  end
  # GET /resource/cancel
  # Forces the session data which is usually expired after sign
  # in to be expired now. This is useful if the user wants to
  # cancel oauth signing in/up in the middle of the process,
  # removing all OAuth session data.
  # def cancel
  #   super
  # end

  # protected

  # If you have extra params to permit, append them to the sanitizer.
  # def configure_sign_up_params
  #   devise_parameter_sanitizer.permit(:sign_up, keys: [:attribute])
  # end

  # If you have extra params to permit, append them to the sanitizer.
  # def configure_account_update_params
  #   devise_parameter_sanitizer.permit(:account_update, keys: [:attribute])
  # end

  # The path used after sign up.
  # def after_sign_up_path_for(resource)
  #   super(resource)
  # end

  # The path used after sign up for inactive accounts.
  # def after_inactive_sign_up_path_for(resource)
  #   super(resource)
  # end

    private 

    def after_update_path_for(resource)
      edit_user_registration_path
    end

    def user_update_params
      params.permit(:email, :names, :last_names, :birthday, :avatar, :rol_id, :document_type, :number_document, :rol_user)
    end

    def user_params
      params.permit(:email, :password, :password_confirmation, :names, :last_names, :birthday, :avatar, :rol_id, :document_type, :number_document, :rol_user)
    end
    
end

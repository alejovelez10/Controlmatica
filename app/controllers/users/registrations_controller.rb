# frozen_string_literal: true

class Users::RegistrationsController < Devise::RegistrationsController
  respond_to :html, :js, :only => [:new, :update, :create]
  skip_before_action :verify_authenticity_token, :only => [:delete_user, :create_user, :update_user]

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

  def menu
    @user = User.find(params[:id])
    @user.update(menu: params[:name])
  end

  def update_user
    @user = User.find(params[:id])

    puts "klsñhlksadjfñlkasdjñlasdjkñladskjñadskljkadskñlfjdsñkldsajkñlafdjkñl"
    if user_params["password"].length == 0
      params_new =  user_update_params
    else
      params_new = user_params
    end

    if @user.update(params_new)
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        type: "success"
      }

      User.get_values(current_user.id)

    else 
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @cost_center.errors.full_messages
      }
    end
  end

  #venta o proyecto, los centros de costos, en materiales, en tableristas proyectos, reportes proyectos y servicios 
  #cuando es servicio solo muestra horas ingeneria, cuando es venta solo muestra horas de ingeria,  Valor Viaticos Total Cotizacion, cuando es venta ,muestra materiales, total cotizacion, cuando es proyecto si deja todo, el show tambien 

  def delete_user
    @user = User.find(params[:id])
    if @user.destroy
        render :json => @user
    else
        render :json => @user.errors.full_messages
    end
  end

  def get_users
    if params[:name] || params[:email] || params[:rol_id] || params[:state] || params[:number_document]
      @users = User.all.paginate(page: params[:page], :per_page => 30).search(params[:name], params[:email], params[:rol_id], params[:state], params[:number_document])
      @users_total = User.all.search(params[:name], params[:email], params[:rol_id], params[:state], params[:number_document]).count

    elsif params[:filter]
      @users = User.all.paginate(page: params[:page], :per_page => params[:filter])
      @users_total = User.all.count
    else
      @users = User.all.paginate(page: params[:page], :per_page => 30).order(id: :desc)
      @users_total = User.all.count
    end

    @users =  @users.to_json(:include => [:rol => {:only =>[:name]}])
    @users = JSON.parse(@users)
    render :json => { users_paginate: @users, users_total: @users_total }
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
        redirect_to users_path
      else 

        @users.errors.each do |e|
            puts e
        end
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

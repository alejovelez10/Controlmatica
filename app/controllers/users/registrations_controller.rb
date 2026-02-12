# frozen_string_literal: true

class Users::RegistrationsController < Devise::RegistrationsController
  respond_to :html, :js, :only => [:new, :update, :create]
  skip_before_action :verify_authenticity_token, :only => [:delete_user, :create_user, :update_user, :get_users]

  SORTABLE_COLUMNS = %w[names email number_document document_type].freeze

  def edit
  end

  def user_edit
    @user = User.find(params[:id])
  end

  def menu
    @user = User.find(params[:id])
    @user.update(menu: params[:name])
  end

  def get_users
    users = User.includes(:rol).all

    # Búsqueda
    if params[:name].present?
      users = users.where("LOWER(names) LIKE ?", "%#{params[:name].downcase}%")
    end

    # Ordenamiento
    if params[:sort].present? && SORTABLE_COLUMNS.include?(params[:sort])
      direction = params[:dir] == "desc" ? :desc : :asc
      users = users.order(params[:sort] => direction)
    else
      users = users.order(created_at: :desc)
    end

    page = (params[:page] || 1).to_i
    per_page = [(params[:per_page] || 10).to_i, 100].min
    total = users.count
    paginated = users.offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: paginated.map do |user|
        user.as_json(
          only: [:id, :names, :email, :document_type, :number_document, :rol_id],
          include: { rol: { only: [:id, :name] } }
        ).merge(
          avatar: user.avatar.present? ? { url: user.avatar.url } : nil
        )
      end,
      meta: { total: total, page: page, per_page: per_page, total_pages: (total.to_f / per_page).ceil }
    }
  end

  def create_user
    @user = User.new(user_params)
    @user.actual_user = current_user.id

    if @user.save
      render json: { success: true, message: "Usuario creado exitosamente" }, status: :created
    else
      render json: { success: false, errors: @user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update_user
    @user = User.find(params[:id])

    update_params = if params[:password].present? && params[:password].length > 0
      user_params.merge(actual_user: current_user.id)
    else
      user_update_params.merge(actual_user: current_user.id)
    end

    if @user.update(update_params)
      render json: { success: true, message: "Usuario actualizado exitosamente" }
    else
      render json: { success: false, errors: @user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def delete_user
    @user = User.find(params[:id])
    if @user.destroy
      render json: @user
    else
      render json: @user.errors.full_messages
    end
  end

  private

  def after_update_path_for(resource)
    edit_user_registration_path
  end

  def user_update_params
    params.permit(:email, :names, :last_names, :birthday, :avatar, :rol_id, :document_type, :number_document, :rol_user, :actual_user)
  end

  def user_params
    params.permit(:email, :password, :password_confirmation, :names, :last_names, :birthday, :avatar, :rol_id, :document_type, :number_document, :rol_user, :actual_user)
  end
end

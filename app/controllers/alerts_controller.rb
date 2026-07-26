class AlertsController < ApplicationController
  before_action :authenticate_user!
  skip_before_action :verify_authenticity_token, only: [:create, :update, :destroy, :get_alerts]

  def index
    @estados = { create: true, edit: true, delete: true }
  end

  def get_alerts
    alerts = Alert.all

    if params[:name].present?
      alerts = alerts.where("LOWER(name) LIKE ?", "%#{params[:name].downcase}%")
    end

    alerts = alerts.order(created_at: :desc)

    page = (params[:page] || 1).to_i
    per_page = [(params[:per_page] || 10).to_i, 100].min
    total = alerts.count
    paginated = alerts.offset((page - 1) * per_page).limit(per_page)

    render json: {
      data: paginated.as_json(except: [:created_at, :updated_at]),
      meta: { total: total, page: page, per_page: per_page, total_pages: (total.to_f / per_page).ceil }
    }
  end

  def show
    alert = Alert.find(params[:id])
    render json: alert.as_json(except: [:created_at, :updated_at])
  end

  def create
    alert = Alert.new(alert_params)
    if alert.save
      render json: { success: true, message: "Alerta creada exitosamente" }, status: :created
    else
      render json: { success: false, errors: alert.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    @alert = Alert.find(params[:id])
    if @alert.update(alert_params)
      render json: { success: true, message: "Alerta actualizada exitosamente" }
    else
      render json: { success: false, errors: @alert.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @alert = Alert.find(params[:id])
    if @alert.destroy
      render json: { success: true, message: "Alerta eliminada exitosamente" }
    else
      render json: { success: false, errors: @alert.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def alert_params
    defaults = { user_id: current_user.id }
    params.permit(
      :name,
      :ing_ejecucion_min, :ing_ejecucion_med, :ing_ejecucion_max,
      :ing_costo_min, :ing_costo_med, :ing_costo_max,
      :tab_ejecucion_min, :tab_ejecucion_med, :tab_ejecucion_max,
      :tab_costo_min, :tab_costo_med, :tab_costo_max,
      :desp_min, :desp_med, :desp_max,
      :mat_min, :mat_med, :mat_max,
      :via_min, :via_med, :via_max,
      :total_min, :total_med, :tatal_max,
      :alert_min, :color_min, :alert_med, :color_mid, :alert_max, :color_max,
      :alert_hour_min, :alert_hour_med, :alert_hour_max,
      :color_hour_min, :color_hour_med, :color_hour_max,
      :commision_porcentaje
    ).reverse_merge(defaults)
  end
end

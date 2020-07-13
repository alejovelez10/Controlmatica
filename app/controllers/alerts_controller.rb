class AlertsController < ApplicationController
  before_action :authenticate_user!
  before_action :alert_find, :only => [:update, :destroy]

  def index
    #modulo = Section.find_by_name("Procesos")
    #create = current_user.position.section_accions.where(section_id: modulo.id).where(name: "Crear").exists?
    #edit = current_user.position.section_accions.where(section_id: modulo.id).where(name: "Editar").exists?
    #eliminar = current_user.position.section_accions.where(section_id: modulo.id).where(name: "Eliminar").exists?

    @estados = {
      crear: true,
      editar: true,
      eliminar: true,
    }
  end

  def create
    alert = Alert.create(alert_params)
    if alert.save
        render :json => {
            success: "El Registro fue creado con exito!",
            type: "success",
        }
    else
        render :json => {
            success: "El Registro No se creo!",
            type: "error",
        }
    end
  end

  def get_alerts
    alerts = Alert.all
    render json: {
      data: ActiveModelSerializers::SerializableResource.new(alerts, each_serializer: AlertSerializer),
    }
  end

  def update
    update_status = @alert.update(alert_params)
    if update_status
        render :json => {
            success: "El Registro fue actualizado con exito!",
            type: "success",
        }
    end
  end

  def destroy
    if @alert.destroy
        render :json => {
            success: "El Registro fue eliminado con exito!",
            type: "success",
        }
    end
  end

  private

  def alert_find
    @alert = Alert.find(params[:id])
  end

  def alert_params
    defaults = {user_id: current_user.id}
    params.permit(:name, :ing_ejecucion_min, :ing_ejecucion_med, :ing_ejecucion_max, :ing_costo_min, :ing_costo_med, :ing_costo_max, :tab_ejecucion_min, :tab_ejecucion_med, :tab_ejecucion_max, :tab_costo_min, :tab_costo_med, :tab_costo_max, :desp_min, :desp_med, :desp_max, :mat_min, :mat_med, :mat_max, :via_min, :via_med, :via_max, :total_min, :total_med, :tatal_max, :user_id).reverse_merge(defaults)
  end

end

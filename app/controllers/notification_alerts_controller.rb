class NotificationAlertsController < ApplicationController
    def index
        modulo = ModuleControl.find_by_name("Notificación de alertas")
        review = current_user.rol.accion_modules.where(module_control_id: modulo.id).where(name: "Revisar").exists?
    
        @estados = {      
          review: (current_user.rol.name == "Administrador" ? true : review)
        }
    end

    def get_notifications_alerts
        notifications_alerts = NotificationAlert.where(state: params[:state]).paginate(page: params[:page], :per_page => 10).order(date_update: :desc).to_json( :include => { :user => { :only =>[:names] }, :cost_center => { :only =>[:description, :code] } })
        notifications_alerts = JSON.parse(notifications_alerts)
        total = NotificationAlert.where(state: params[:state]).count

        render :json => {
            data: notifications_alerts,
            total: total
        }
    end

    def update_all
        notifications_alert = NotificationAlert.where(state: false)
        status_update = notifications_alert.update_all(state: true)
        
        if status_update
            render :json => {
                message: "¡El Registro fue actualizado con exito!",
                type: "success"
            }
        end
    end

    def update_state
        notifications_alert = NotificationAlert.find(params[:id])
        notifications_alert.update(state: true)
        
        render :json => {
            message: "¡El Registro fue actualizado con exito!",
            type: "success"
        }
    end
end

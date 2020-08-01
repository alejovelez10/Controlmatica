class NotificationAlertsController < ApplicationController
    def index

    end

    def get_notifications_alerts
        notifications_alerts = NotificationAlert.all.to_json( :include => { :user => { :only =>[:names] }, :cost_center => { :only =>[:description] } })
        notifications_alerts = JSON.parse(notifications_alerts)

        render :json => {
            data: notifications_alerts,
        }
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

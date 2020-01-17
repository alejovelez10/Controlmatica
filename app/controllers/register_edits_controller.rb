class RegisterEditsController < ApplicationController
    
    def get_notifications

        notifications_pending = RegisterEdit.where(state: "pending").to_json( :include => { :user => { :only =>[:names] }, :register_user => { :only =>[:names] } })
        notifications_revised = RegisterEdit.where(state: "revised").to_json( :include => { :user => { :only =>[:names] }, :register_user => { :only =>[:names] } })

        notifications_pending = JSON.parse(notifications_pending)
        notifications_revised = JSON.parse(notifications_revised)

        render :json => {
            notifications_pending: notifications_pending,
            notifications_revised: notifications_revised
        }

    end

    def notifications
        @estados = {
            create: (current_user.rol.name == "Administrador" ? true : true),
            edit: (current_user.rol.name == "Administrador" ? true : true),
            delete: (current_user.rol.name == "Administrador" ? true : true),
        }
    end

    def update_state
        notification_update = RegisterEdit.find(params[:id])
        notification_update.update(state: "revised")
        
        render :json => {
            message: "¡El Registro fue actualizado con exito!",
            type: "success"
        }
    end
    

end

class RegisterEditsController < ApplicationController
    
    def get_notifications
        notifications_pending = RegisterEdit.all.to_json( :include => { :user => { :only =>[:names] }})
        notifications_pending = JSON.parse(notifications_pending)

        render :json => {
            data: notifications_pending,
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

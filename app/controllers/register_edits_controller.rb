class RegisterEditsController < ApplicationController
    
    def get_notifications
        notifications = RegisterEdit.all.to_json( :include => { :user => { :only =>[:names] }, :register_user => { :only =>[:names] } })
        notifications = JSON.parse(notifications)
        render :json => {
            notifications: notifications
        }
    end

    def notifications
        @estados = {
            create: (current_user.rol.name == "Administrador" ? true : true),
            edit: (current_user.rol.name == "Administrador" ? true : true),
            delete: (current_user.rol.name == "Administrador" ? true : true),
        }
    end
    
    
end

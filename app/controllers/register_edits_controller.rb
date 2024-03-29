class RegisterEditsController < ApplicationController
    
    def get_notifications
        notifications_pending = RegisterEdit.where(state: params[:state]).paginate(page: params[:page], :per_page => 10).order(created_at: :desc).to_json( :include => { :user => { :only =>[:names] }})
        total = RegisterEdit.where(state: params[:state]).count
        notifications_pending = JSON.parse(notifications_pending)

        render :json => {
            data: notifications_pending,
            total: total
        }
    end

    def notifications
        modulo = ModuleControl.find_by_name("Registro de edicion")
        review = current_user.rol.accion_modules.where(module_control_id: modulo.id).where(name: "Revisar").exists?
    
        @estados = {      
          review: (current_user.rol.name == "Administrador" ? true : review)
        }
    end 

    def update_all
        notification_update = RegisterEdit.where(state: "pending")
        status_update = notification_update.update_all(state: "revised")
        
        if status_update
            render :json => {
                message: "¡El Registro fue actualizado con exito!",
                type: "success"
            }
        end
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

class ShiftsController < ApplicationController
    before_action :authenticate_user!, except: [:show]
    before_action :shift_find, :only => [:update, :destroy]

    def index
        @estados = {
            crear: true,
            editar: true,
            eliminar: true,
            gestionar: true,
        }
    end

    def calendar
        #render :layout => "application"
    end

    def get_shift_info
        shift = Shift.find(params[:shift_id])

        render :json => {
            register: ActiveModelSerializers::SerializableResource.new(shift, each_serializer: ShiftSerializer),
            type: "success"
        }
    end

    def create
        shift = Shift.create(shift_create_params)
        if shift.save
            if @user_name 
                CreateEvenInMicrosoftJob.set(wait: 5.seconds).perform_later(shift, access_token, user_timezone)
            end

            render :json => {
                success: "¡El Registro fue creado con éxito!",
                register: ActiveModelSerializers::SerializableResource.new(shift, each_serializer: ShiftSerializer),
                type: "success"
            }
        else
            render :json => {
                success: "¡El Registro No se creó!",
                type: "error" 
            }
        end
    end

    def get_cost_center_description
        cost_center = CostCenter.find(params[:cost_center_id])
        render json: {
            register: { id: cost_center.id, description: cost_center.description },
        }
    end

    def get_shifts
        module_control = ModuleControl.find_by_name("Turnos")
        show = current_user.rol.accion_modules.where(module_control_id: module_control.id).where(name: "Ver todos").exists?

        if params[:view] == "All"
            if params[:start_date] || params[:end_date] || params[:cost_center_ids] || params[:user_responsible_ids]
                const_center_ids = params[:cost_center_ids].split(",")
                user_responsible_ids = params[:user_responsible_ids].split(",")

                shifts = Shift.search(params[:start_date], params[:end_date], const_center_ids, user_responsible_ids).order(created_at: :asc)
            else
                shifts = Shift.all.order(created_at: :asc)
            end

        elsif params[:view] == "MY"
            if params[:start_date] || params[:end_date] || params[:cost_center_ids] || params[:user_responsible_ids]
                const_center_ids = params[:cost_center_ids].split(",")
                user_responsible_ids = params[:user_responsible_ids].split(",")

                shifts = Shift.where(user_responsible_id: current_user.id).search(params[:start_date], params[:end_date], const_center_ids, user_responsible_ids).order(created_at: :asc)
            else
                shifts = Shift.where(user_responsible_id: current_user.id).order(created_at: :asc)
            end
        else
            if params[:start_date] || params[:end_date] || params[:cost_center_ids] || params[:user_responsible_ids]
                const_center_ids = params[:cost_center_ids].split(",")
                user_responsible_ids = params[:user_responsible_ids].split(",")

                if show
                    shifts = Shift.search(params[:start_date], params[:end_date], const_center_ids, user_responsible_ids).order(created_at: :asc)
                else
                    shifts = Shift.where(user_responsible_id: current_user.id).search(params[:start_date], params[:end_date], const_center_ids, user_responsible_ids).order(created_at: :asc)
                end
            else
                if show
                    shifts = Shift.all.order(created_at: :asc)
                else
                    shifts = Shift.where(user_responsible_id: current_user.id).order(created_at: :asc)
                end
            end
        end
        
        render json: {
            data: ActiveModelSerializers::SerializableResource.new(shifts, each_serializer: ShiftSerializer),
        }
    end

    def get_shifts_const_center
        shifts = CostCenter.find(params[:const_center_id]).shifts
        render json: {
            data: ActiveModelSerializers::SerializableResource.new(shifts, each_serializer: ShiftSerializer),
        }
    end

    def update
        shift = @shift.update(shift_update_params)
        if shift
            render :json => {
                success: "¡El Registro fue actualizado con éxito!",
                register: ActiveModelSerializers::SerializableResource.new(@shift, each_serializer: ShiftSerializer),
                type: "success"
            }
        end
    end

    def destroy 
        if @shift.destroy
            render :json => {
                success: "¡El Registro fue eliminado con éxito!",
                type: "success"
            }
        end
    end

    
    private 

        def shift_find
            @shift = Shift.find(params[:id])
        end
        
        def shift_create_params
            defaults = { user_id: current_user.id }
            params.permit(:user_id, :end_date, :start_date, :cost_center_id, :user_responsible_id, :subject, :description, :user_ids => []).reverse_merge(defaults)
        end

        def shift_update_params
            params.permit(:end_date, :start_date, :cost_center_id, :user_responsible_id, :subject, :description, :user_ids => [])
        end
end

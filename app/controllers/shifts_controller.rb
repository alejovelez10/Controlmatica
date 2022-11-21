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

    def create
        shift = Shift.create(shift_create_params)
        if shift.save
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

    def get_shifts
        shifts = Shift.all.order(created_at: :asc)
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
            params.permit(:user_id, :end_date, :start_date, :cost_center_id, :user_responsible_id).reverse_merge(defaults)
        end

        def shift_update_params
            params.permit(:end_date, :start_date, :cost_center_id, :user_responsible_id)
        end
end

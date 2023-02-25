class ShiftsController < ApplicationController
    before_action :authenticate_user!, except: [:show]
    before_action :shift_find, :only => [:update, :destroy]
    include GraphHelper

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
      

       users = User.where(id: shift_create_params["user_ids"])
       errors = []
       users.each do |user|
        create_row = true
        Shift.where(user_responsible_id: user.id).each do |s|
            if  shift_create_params["start_date"] >= s.start_date && shift_create_params["start_date"] <= s.end_date
                create_row = false
                errors << user.email
            end

            if  shift_create_params["start_date"] < s.start_date && shift_create_params["end_date"] >= s.start_date
                create_row = false
                errors << user.email
            end
        end

        force_save = (shift_create_params["force_save"] ? true : (errors.length == 0 ? true : false) )

        if force_save
            shift =  Shift.create(
                    start_date: shift_create_params["start_date"],
                    end_date: shift_create_params["end_date"],
                    cost_center_id: shift_create_params["cost_center_id"],
                    description: shift_create_params["description"],
                    subject: shift_create_params["subject"],
                    force_save: shift_create_params["force_save"],
                    color: shift_create_params["color"],
                    user_id: current_user.id,
                    user_responsible_id: user.id,
                )

                if shift.save
                    if @user_name 
                        CreateEvenInMicrosoftJob.set(wait: 2.seconds).perform_later(shift, access_token, user_timezone)
                    end
                end
        end


       end

       force_save = (shift_create_params["force_save"] ? true : (errors.length == 0 ? true : false) )

            render :json => {
                success: "¡El Registro fue creado con éxito!",
                errors: errors,
                force_save: force_save,
                #register: ActiveModelSerializers::SerializableResource.new(shift, each_serializer: ShiftSerializer),
                type: "success"
            }
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

        if params[:from] == "ALL"
            if params[:start_date] || params[:end_date] || params[:cost_center_ids] || params[:user_responsible_ids]
                const_center_ids = params[:cost_center_ids].split(",")
                user_responsible_ids = params[:user_responsible_ids].split(",")

                shifts = Shift.search(params[:start_date], params[:end_date], const_center_ids, user_responsible_ids).order(created_at: :asc)
            else
                puts "ALLALLALLALLALLALLALLALLALLALLALLALLALLALLALLALLALL"
                shifts = Shift.all.order(created_at: :asc)
            end

        elsif params[:from] == "MY"
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

                if true
                    puts "filtrando todos"
                    shifts = Shift.search(params[:start_date], params[:end_date], const_center_ids, user_responsible_ids).order(created_at: :asc)
                else
                    puts "filtrando los que soy responsable mas los filtros"
                    shifts = Shift.where(user_responsible_id: current_user.id).search(params[:start_date], params[:end_date], const_center_ids, user_responsible_ids).order(created_at: :asc)
                end
            else
                if true
                    shifts = Shift.all.order(created_at: :asc)
                else
                    shifts = Shift.where(user_responsible_id: current_user.id).order(created_at: :asc)
                end
            end
        end

        puts shifts
        puts "jajaajjaajajajajaj"

        render json: {
            data: ActiveModelSerializers::SerializableResource.new(shifts, each_serializer: ShiftSerializer),
        }
    end

    def get_shifts_const_center
        if params[:start_date] || params[:end_date] || params[:cost_center_ids] || params[:user_responsible_ids]
            const_center_ids = [] << params[:const_center_id]
            user_responsible_ids = params[:user_responsible_ids].split(",")

            shifts = Shift.where(cost_center_id: params[:const_center_id]).search(params[:start_date], params[:end_date], const_center_ids, user_responsible_ids).order(created_at: :asc)
        else
            shifts = Shift.where(cost_center_id: params[:const_center_id])
        end
        
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

        if true
            if @user_name && @shift.microsoft_id.present?
                @shift.destroy

                new_event = {
                    'contentType' => 'text',
                    'content' => ""
                }
                delete_in_calendar("DELETE", "/v1.0/me/events/#{@shift.microsoft_id}", access_token, nil, nil, new_event)
            else
                @shift.destroy
            end

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
            params.permit(:user_id, :end_date, :start_date, :cost_center_id, :user_responsible_id, :subject, :description, :force_save, :color, :user_ids => []).reverse_merge(defaults)
        end

        def shift_update_params
            params.permit(:end_date, :start_date, :cost_center_id, :user_responsible_id, :subject, :description, :force_save, :color, :user_ids => [])
        end
end

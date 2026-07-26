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
        shift = Shift.includes(:cost_center, :user_responsible, :users).find(params[:shift_id])

        render :json => {
            register: ActiveModelSerializers::SerializableResource.new(shift, each_serializer: ShiftSerializer),
            type: "success"
        }
    end

    def create
        user_ids = shift_create_params["user_ids"]
        users = User.where(id: user_ids)
        errors = []

        start_date = shift_create_params["start_date"].to_datetime
        end_date = shift_create_params["end_date"].to_datetime

        # Cargar todos los turnos conflictivos en una sola query
        conflicting_shifts = Shift.where(user_responsible_id: user_ids)
                                  .where("(start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?)",
                                         start_date, start_date, end_date, end_date, start_date, end_date)
                                  .pluck(:user_responsible_id)
                                  .uniq

        # Encontrar usuarios con conflictos
        users_with_conflicts = User.where(id: conflicting_shifts).pluck(:email)
        errors = users_with_conflicts

        force_save = shift_create_params["force_save"] || errors.empty?

        if force_save
            users.each do |user|
                shift = Shift.create(
                    start_date: start_date,
                    end_date: end_date,
                    cost_center_id: shift_create_params["cost_center_id"],
                    description: shift_create_params["description"],
                    subject: shift_create_params["subject"],
                    force_save: shift_create_params["force_save"],
                    color: shift_create_params["color"],
                    user_id: current_user.id,
                    user_responsible_id: user.id,
                )

                if shift.persisted? && @user_name
                    CreateEvenInMicrosoftJob.set(wait: 2.seconds).perform_later(shift, access_token, user_timezone)
                end
            end
        end

        render :json => {
            success: "¡El Registro fue creado con éxito!",
            errors: errors,
            force_save: force_save,
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
        # Base query con eager loading para evitar N+1
        base_query = Shift.includes(:cost_center, :user_responsible, :users)

        # Filtrar por usuario si es "MY"
        if params[:from] == "MY"
            base_query = base_query.where(user_responsible_id: current_user.id)
        end

        # Aplicar filtros de búsqueda
        if params[:start_date].present? || params[:end_date].present? || params[:cost_center_ids].present? || params[:user_responsible_ids].present?
            cost_center_ids = params[:cost_center_ids].present? ? params[:cost_center_ids].split(",") : []
            user_responsible_ids = params[:user_responsible_ids].present? ? params[:user_responsible_ids].split(",") : []

            shifts = base_query.search(params[:start_date], params[:end_date], cost_center_ids, user_responsible_ids)
                               .order(start_date: :asc)
        else
            # Sin filtros: mostrar turnos de los últimos 6 meses y próximos 6 meses
            date_from = 6.months.ago.beginning_of_day
            date_to = 6.months.from_now.end_of_day
            shifts = base_query.where(start_date: date_from..date_to)
                               .or(base_query.where(end_date: date_from..date_to))
                               .order(start_date: :asc)
        end

        render json: {
            data: ActiveModelSerializers::SerializableResource.new(shifts, each_serializer: ShiftSerializer),
        }
    end

    def get_shifts_const_center
        base_query = Shift.includes(:cost_center, :user_responsible, :users)
                          .where(cost_center_id: params[:const_center_id])

        if params[:start_date].present? || params[:end_date].present? || params[:user_responsible_ids].present?
            cost_center_ids = [params[:const_center_id]]
            user_responsible_ids = params[:user_responsible_ids].present? ? params[:user_responsible_ids].split(",") : []

            shifts = base_query.search(params[:start_date], params[:end_date], cost_center_ids, user_responsible_ids)
                               .order(start_date: :asc)
        else
            shifts = base_query.order(start_date: :asc)
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

    # Búsqueda de centros de costo con autocomplete
    def search_cost_centers
        query = params[:q].to_s.strip

        if query.length >= 2
            cost_centers = CostCenter.where("service_type IN (?)", ["SERVICIO", "PROYECTO"])
                                     .where("LOWER(code) LIKE ? OR LOWER(description) LIKE ?",
                                            "%#{query.downcase}%", "%#{query.downcase}%")
                                     .limit(20)
                                     .pluck(:id, :code)
                                     .map { |id, code| { value: id, label: code } }
        else
            cost_centers = []
        end

        render json: cost_centers
    end

    # Búsqueda de usuarios con autocomplete
    def search_users
        query = params[:q].to_s.strip

        if query.length >= 2
            users = User.where("LOWER(names) LIKE ? OR LOWER(email) LIKE ?",
                              "%#{query.downcase}%", "%#{query.downcase}%")
                       .limit(20)
                       .pluck(:id, :names)
                       .map { |id, names| { value: id, label: names } }
        else
            users = []
        end

        render json: users
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

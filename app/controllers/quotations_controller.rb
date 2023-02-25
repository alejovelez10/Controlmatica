class QuotationsController < ApplicationController
    before_action :authenticate_user!
    before_action :quotation_find, :only => [:update, :destroy]

    def create
        quotation = Quotation.create(quotation_params)
        if quotation.save
            render :json => {
                success: "¡El Registro fue creado con éxito!",
                register: ActiveModelSerializers::SerializableResource.new(quotation, each_serializer: QuotationSerializer),
                type: "success"
            }
        else
            render :json => {
                success: "¡El Registro No se creó!",
                type: "error" 
            }
        end
    end

    def update
        update_status = @quotation.update(quotation_params)
        if update_status
            render :json => {
                success: "¡El Registro fue actualizado con éxito!",
                register: ActiveModelSerializers::SerializableResource.new(@quotation, each_serializer: QuotationSerializer),
                type: "success"
            }
        end
    end

    def destroy 
        if @quotation.destroy
            render :json => {
                success: "¡El Registro fue eliminado con éxito!",
                type: "success"
            }
        end
    end

    def get_quotations
        quotations = Quotation.where(cost_center_id: params[:cost_center_id])
        render :json => {
            data: ActiveModelSerializers::SerializableResource.new(quotations, each_serializer: QuotationSerializer),
        } 
    end
    
    private 

        def quotation_find
            @quotation = Quotation.find(params[:id])
        end
        
        def quotation_params
            params.permit(:cost_center_id, :description, :quotation_number, :eng_hours, :hour_real, :hour_cotizada, :hours_contractor, :hours_contractor_real, :hours_contractor_invoices, :displacement_hours, :value_displacement_hours, :materials_value, :viatic_value, :quotation_value)
        end
end



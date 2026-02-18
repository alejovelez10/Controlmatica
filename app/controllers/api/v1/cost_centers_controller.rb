module Api
  module V1
    class CostCentersController < BaseController
      def index
        page = [params.fetch(:page, 1).to_i, 1].max
        per_page = [[params.fetch(:per_page, 100).to_i, 1].max, 1000].min

        total = CostCenter.count
        total_pages = (total.to_f / per_page).ceil

        cost_centers = CostCenter
          .includes(:customer, :contact, :user_owner)
          .order(:id)
          .offset((page - 1) * per_page)
          .limit(per_page)

        render json: {
          data: cost_centers.map { |cc| serialize_cost_center(cc) },
          meta: {
            page: page,
            per_page: per_page,
            total: total,
            total_pages: total_pages
          }
        }
      end

      private

      def serialize_cost_center(cc)
        {
          id: cc.id,
          code: cc.code,
          description: cc.description,
          service_type: cc.service_type,
          execution_state: cc.execution_state,
          invoiced_state: cc.invoiced_state,
          sales_state: cc.sales_state,
          start_date: cc.start_date,
          end_date: cc.end_date,
          quotation_number: cc.quotation_number,
          quotation_value: cc.quotation_value,
          # Ingeniería
          eng_hours: cc.eng_hours,
          hour_cotizada: cc.hour_cotizada,
          hour_real: cc.hour_real,
          engineering_value: cc.engineering_value,
          ingenieria_total_costo: cc.ingenieria_total_costo,
          ing_horas_eje: cc.ing_horas_eje,
          ing_horas_porcentaje: cc.ing_horas_porcentaje,
          ing_costo_cotizado: cc.ing_costo_cotizado,
          ing_costo_real: cc.ing_costo_real,
          ing_costo_porcentaje: cc.ing_costo_porcentaje,
          # Contratistas/Tableristas
          hours_contractor: cc.hours_contractor,
          hours_contractor_invoices: cc.hours_contractor_invoices,
          hours_contractor_real: cc.hours_contractor_real,
          work_force_contractor: cc.work_force_contractor,
          contractor_total_costo: cc.contractor_total_costo,
          cont_horas_eje: cc.cont_horas_eje,
          cont_horas_porcentaje: cc.cont_horas_porcentaje,
          cont_costo_cotizado: cc.cont_costo_cotizado,
          cont_costo_real: cc.cont_costo_real,
          cont_costo_porcentaje: cc.cont_costo_porcentaje,
          # Materiales
          materials_value: cc.materials_value,
          sum_materials_costo: cc.sum_materials_costo,
          sum_materials_value: cc.sum_materials_value,
          mat_costo_real: cc.mat_costo_real,
          mat_costo_porcentaje: cc.mat_costo_porcentaje,
          # Desplazamiento
          displacement_hours: cc.displacement_hours,
          value_displacement_hours: cc.value_displacement_hours,
          offset_value: cc.offset_value,
          desp_horas_eje: cc.desp_horas_eje,
          desp_horas_porcentaje: cc.desp_horas_porcentaje,
          # Viáticos
          viatic_value: cc.viatic_value,
          sum_viatic: cc.sum_viatic,
          viat_costo_real: cc.viat_costo_real,
          viat_costo_porcentaje: cc.viat_costo_porcentaje,
          # AIU y totales
          aiu: cc.aiu,
          aiu_percent: cc.aiu_percent,
          aiu_real: cc.aiu_real,
          aiu_percent_real: cc.aiu_percent_real,
          total_expenses: cc.total_expenses,
          fact_real: cc.fact_real,
          fact_porcentaje: cc.fact_porcentaje,
          # Timestamps
          created_at: cc.created_at,
          updated_at: cc.updated_at,
          # Foreign keys para JOIN en BigQuery
          customer_id: cc.customer_id,
          contact_id: cc.contact_id,
          user_owner_id: cc.user_owner_id,
          # Relaciones con nombres
          customer: cc.customer ? { id: cc.customer.id, name: cc.customer.name } : nil,
          contact: cc.contact ? { id: cc.contact.id, name: cc.contact.name } : nil,
          user_owner: cc.user_owner ? { id: cc.user_owner.id, name: cc.user_owner.names } : nil
        }
      end
    end
  end
end

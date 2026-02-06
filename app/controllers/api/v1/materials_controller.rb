module Api
  module V1
    class MaterialsController < BaseController
      def index
        page = [params.fetch(:page, 1).to_i, 1].max
        per_page = [[params.fetch(:per_page, 100).to_i, 1].max, 1000].min

        total = Material.count
        total_pages = (total.to_f / per_page).ceil

        materials = Material
          .includes(:cost_center, :provider)
          .order(:id)
          .offset((page - 1) * per_page)
          .limit(per_page)

        render json: {
          data: materials.map { |m| serialize_material(m) },
          meta: {
            page: page,
            per_page: per_page,
            total: total,
            total_pages: total_pages
          }
        }
      end

      private

      def serialize_material(m)
        {
          id: m.id,
          sales_number: m.sales_number,
          sales_date: m.sales_date,
          sales_state: m.sales_state,
          amount: m.amount,
          description: m.description,
          delivery_date: m.delivery_date,
          provider_invoice_number: m.provider_invoice_number,
          provider_invoice_value: m.provider_invoice_value,
          created_at: m.created_at,
          updated_at: m.updated_at,
          # Foreign keys para JOIN en BigQuery
          cost_center_id: m.cost_center_id,
          provider_id: m.provider_id,
          # Relaciones con nombres
          cost_center: m.cost_center ? { id: m.cost_center.id, code: m.cost_center.code } : nil,
          provider: m.provider ? { id: m.provider.id, name: m.provider.name } : nil
        }
      end
    end
  end
end

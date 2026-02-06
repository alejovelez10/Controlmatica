module Api
  module V1
    class ContractorsController < BaseController
      def index
        page = [params.fetch(:page, 1).to_i, 1].max
        per_page = [[params.fetch(:per_page, 100).to_i, 1].max, 1000].min

        total = Contractor.count
        total_pages = (total.to_f / per_page).ceil

        contractors = Contractor
          .includes(:cost_center, :user_execute)
          .order(:id)
          .offset((page - 1) * per_page)
          .limit(per_page)

        render json: {
          data: contractors.map { |c| serialize_contractor(c) },
          meta: {
            page: page,
            per_page: per_page,
            total: total,
            total_pages: total_pages
          }
        }
      end

      private

      def serialize_contractor(c)
        {
          id: c.id,
          sales_number: c.sales_number,
          sales_date: c.sales_date,
          hours: c.hours,
          ammount: c.ammount,
          description: c.description,
          created_at: c.created_at,
          updated_at: c.updated_at,
          # Foreign keys para JOIN en BigQuery
          cost_center_id: c.cost_center_id,
          user_execute_id: c.user_execute_id,
          # Relaciones con nombres
          cost_center: c.cost_center ? { id: c.cost_center.id, code: c.cost_center.code } : nil,
          user_execute: c.user_execute ? { id: c.user_execute.id, name: c.user_execute.names } : nil
        }
      end
    end
  end
end

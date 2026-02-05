module Api
  module V1
    class CostCentersController < BaseController
      def index
        page = [params.fetch(:page, 1).to_i, 1].max
        per_page = [[params.fetch(:per_page, 100).to_i, 1].max, 1000].min

        total = CostCenter.count
        total_pages = (total.to_f / per_page).ceil

        cost_centers = CostCenter
          .select(:id, :code, :description, :execution_state, :start_date, :end_date, :customer_id, :contact_id)
          .includes(:customer, :contact)
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
          execution_state: cc.execution_state,
          start_date: cc.start_date,
          end_date: cc.end_date,
          customer: cc.customer ? { id: cc.customer.id, name: cc.customer.name } : nil,
          contact: cc.contact ? { id: cc.contact.id, name: cc.contact.name } : nil
        }
      end
    end
  end
end

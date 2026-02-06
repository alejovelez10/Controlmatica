module Api
  module V1
    class ReportsController < BaseController
      def index
        page = [params.fetch(:page, 1).to_i, 1].max
        per_page = [[params.fetch(:per_page, 100).to_i, 1].max, 1000].min

        total = Report.count
        total_pages = (total.to_f / per_page).ceil

        reports = Report
          .includes(:cost_center, :customer, :contact, :report_execute)
          .order(:id)
          .offset((page - 1) * per_page)
          .limit(per_page)

        render json: {
          data: reports.map { |r| serialize_report(r) },
          meta: {
            page: page,
            per_page: per_page,
            total: total,
            total_pages: total_pages
          }
        }
      end

      private

      def serialize_report(r)
        {
          id: r.id,
          code_report: r.code_report,
          report_date: r.report_date,
          report_sate: r.report_sate,
          # Trabajo
          working_time: r.working_time,
          working_value: r.working_value,
          work_description: r.work_description,
          # Desplazamiento
          displacement_hours: r.displacement_hours,
          value_displacement_hours: r.value_displacement_hours,
          # Viáticos
          viatic_value: r.viatic_value,
          viatic_description: r.viatic_description,
          # Total
          total_value: r.total_value,
          # Timestamps
          created_at: r.created_at,
          updated_at: r.updated_at,
          # Foreign keys para JOIN en BigQuery
          cost_center_id: r.cost_center_id,
          customer_id: r.customer_id,
          contact_id: r.contact_id,
          report_execute_id: r.report_execute_id,
          # Relaciones con nombres para conveniencia
          cost_center: r.cost_center ? { id: r.cost_center.id, code: r.cost_center.code } : nil,
          customer: r.customer ? { id: r.customer.id, name: r.customer.name } : nil,
          contact: r.contact ? { id: r.contact.id, name: r.contact.name } : nil,
          report_execute: r.report_execute ? { id: r.report_execute.id, name: r.report_execute.names } : nil
        }
      end
    end
  end
end

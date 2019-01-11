class CreateJoinTableCustomerReportReport < ActiveRecord::Migration[5.2]
  def change
    create_join_table :customer_reports, :reports do |t|
      # t.index [:customer_report_id, :report_id]
      # t.index [:report_id, :customer_report_id]
    end
  end
end

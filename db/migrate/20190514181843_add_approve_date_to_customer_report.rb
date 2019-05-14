class AddApproveDateToCustomerReport < ActiveRecord::Migration[5.2]
  def change
    add_column :customer_reports, :approve_date, :date
  end
end

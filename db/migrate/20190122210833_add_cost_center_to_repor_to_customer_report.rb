class AddCostCenterToReporToCustomerReport < ActiveRecord::Migration[5.2]
  def change
    add_column :customer_reports, :cost_center_id, :integer
  end
end

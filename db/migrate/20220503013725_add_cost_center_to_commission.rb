class AddCostCenterToCommission < ActiveRecord::Migration[5.2]
  def change
    add_column :commissions, :cost_center_id, :integer
    add_column :commissions, :customer_report_id, :integer
  end
end

class AddIndexesForDashboardCounts < ActiveRecord::Migration[6.1]
  def change
    add_index :contractors, :user_id, name: "index_contractors_on_user_id"
    add_index :customer_reports, :user_id, name: "index_customer_reports_on_user_id"
    add_index :expense_ratios, :user_id, name: "index_expense_ratios_on_user_id"
    add_index :materials, :user_id, name: "index_materials_on_user_id"
    add_index :commissions, :user_id, name: "index_commissions_on_user_id"
    add_index :report_expenses, :user_id, name: "index_report_expenses_on_user_id"
  end
end

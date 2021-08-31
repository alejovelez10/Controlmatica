class AddLastUpdateUserToTables < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :last_user_edited_id, :integer
    add_column :sales_orders, :last_user_edited_id, :integer
    add_column :contractors, :last_user_edited_id, :integer
    add_column :reports, :last_user_edited_id, :integer
    add_column :customer_reports, :last_user_edited_id, :integer
    add_column :materials, :last_user_edited_id, :integer
    add_column :report_expenses, :last_user_edited_id, :integer
    add_column :report_expenses, :is_acepted, :boolean, :default => false
    add_column :expense_ratios, :last_user_edited_id, :integer
    add_column :cost_centers, :user_owner_id, :integer

    add_column :expense_ratios, :user_id, :integer
  end
end

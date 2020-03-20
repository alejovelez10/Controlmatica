class AddUpdateUserToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :update_user, :integer
    add_column :sales_orders, :update_user, :integer
    add_column :reports, :update_user, :integer
    add_column :contractors, :update_user, :integer
    add_column :materials, :update_user, :integer
    add_column :customer_reports, :update_user, :integer
  end
end

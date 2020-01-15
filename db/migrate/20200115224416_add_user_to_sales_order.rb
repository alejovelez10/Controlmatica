class AddUserToSalesOrder < ActiveRecord::Migration[5.2]
  def change
    add_column :sales_orders, :user_id, :integer
  end
end

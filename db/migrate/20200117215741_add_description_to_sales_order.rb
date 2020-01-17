class AddDescriptionToSalesOrder < ActiveRecord::Migration[5.2]
  def change
    add_column :sales_orders, :description, :text
    add_column :users, :actual_user, :integer
  end
end

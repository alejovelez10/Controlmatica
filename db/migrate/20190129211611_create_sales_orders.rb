class CreateSalesOrders < ActiveRecord::Migration[5.2]
  def change
    create_table :sales_orders do |t|
      t.date :created_date
      t.string :order_number
      t.float :order_value
      t.string :state
      t.string :order_file
      t.integer :cost_center_id

      t.timestamps
    end
  end
end

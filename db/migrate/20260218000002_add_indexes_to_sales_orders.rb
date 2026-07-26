class AddIndexesToSalesOrders < ActiveRecord::Migration[5.2]
  def change
    add_index :sales_orders, :user_id unless index_exists?(:sales_orders, :user_id)
    add_index :sales_orders, :last_user_edited_id unless index_exists?(:sales_orders, :last_user_edited_id)
    add_index :sales_orders, :created_date unless index_exists?(:sales_orders, :created_date)
    add_index :sales_orders, :order_number unless index_exists?(:sales_orders, :order_number)

    add_index :customer_invoices, :sales_order_id unless index_exists?(:customer_invoices, :sales_order_id)
    add_index :customer_invoices, :cost_center_id unless index_exists?(:customer_invoices, :cost_center_id)
  end
end

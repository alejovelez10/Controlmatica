class AddSumToSalesOrder < ActiveRecord::Migration[5.2]
  def change
    add_column :sales_orders, :sum_invoices, :float
  end
end

class AddEngineeringValueToCustomerInvoice < ActiveRecord::Migration[5.2]
  def change
    add_column :customer_invoices, :engineering_value, :float, :default => 0
    add_column :customer_invoices, :others_value, :float, :default => 0
  end
end

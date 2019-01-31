class CreateCustomerInvoices < ActiveRecord::Migration[5.2]
  def change
    create_table :customer_invoices do |t|
      t.integer :cost_center_id
      t.integer :sales_order_id
      t.float :invoice_value
      t.date :invoice_date
      t.string :delivery_certificate_file
      t.string :delivery_certificate_state
      t.string :reception_report_file
      t.string :reception_report_state
      t.string :invoice_state

      t.timestamps
    end
  end
end

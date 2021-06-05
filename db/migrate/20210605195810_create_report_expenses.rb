class CreateReportExpenses < ActiveRecord::Migration[5.2]
  def change
    create_table :report_expenses do |t|
      t.integer :user_id
      t.integer :cost_center_id
      t.integer :user_invoice_id
      t.string :invoice_name
      t.date :invoice_date
      t.string :type_identification
      t.text :description
      t.string :invoice_number
      t.string :invoice_type
      t.string :payment_type
      
      t.float :invoice_value, :default => 0
      t.float :invoice_tax, :default => 0
      t.float :invoice_total, :default => 0

      t.timestamps
    end
  end
end

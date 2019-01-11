class CreateCustomerReports < ActiveRecord::Migration[5.2]
  def change
    create_table :customer_reports do |t|
      t.date :report_date
      t.text :description
      t.string :token
      t.string :report_state
      t.string :report_code
      t.integer :customer_id

      t.timestamps
    end
  end
end

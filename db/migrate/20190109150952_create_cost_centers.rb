class CreateCostCenters < ActiveRecord::Migration[5.2]
  def change
    create_table :cost_centers do |t|
      t.integer :customer_id
      t.integer :contact_id
      t.text :description
      t.date :start_date
      t.date :end_date
      t.string :quotation_number
      t.float :engineering_value
      t.float :viatic_value
      t.string :execution_state
      t.string :invoiced_state
      t.string :service_type

      t.timestamps
    end
  end
end

class CreateQuotations < ActiveRecord::Migration[6.1]
  def change
    create_table :quotations do |t|
      t.integer :cost_center_id
      t.text :description
      t.string :quotation_number
      t.float :eng_hours
      t.float :hour_real
      t.float :hour_cotizada
      t.float :hours_contractor
      t.float :hours_contractor_real
      t.float :hours_contractor_invoices
      t.float :displacement_hours
      t.float :value_displacement_hours
      t.float :materials_value
      t.float :viatic_value
      t.float :quotation_value

      t.timestamps
    end
  end
end

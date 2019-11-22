class CreateMaterials < ActiveRecord::Migration[5.2]
  def change
    create_table :materials do |t|
      t.integer :provider_id
      t.date :sales_date
      t.string :sales_number
      t.float :amount
      t.date :delivery_date
      t.string :sales_state
      t.text :description
      t.string :provider_invoice_number
      t.float :provider_invoice_value
      t.integer :cost_center_id
      t.integer :user_id

      t.timestamps
    end
  end
end

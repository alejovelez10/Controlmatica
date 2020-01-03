class CreateMaterialInvoices < ActiveRecord::Migration[5.2]
  def change
    create_table :material_invoices do |t|
      t.integer :material_id
      t.integer :user_id
      t.string :number
      t.float :value
      t.text :observation
      t.string :file

      t.timestamps
    end
  end
end

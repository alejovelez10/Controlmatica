class CreateCommissions < ActiveRecord::Migration[5.2]
  def change
    create_table :commissions do |t|
      t.integer :user_id
      t.integer :user_invoice_id
      t.date :start_date
      t.date :end_date
      t.integer :customer_invoice_id
      t.text :observation
      t.float :hours_worked
      t.float :total_value
      t.boolean :is_acepted, :default => false
      t.integer :last_user_edited_id

      t.timestamps
    end
  end
end

class CreateContractors < ActiveRecord::Migration[5.2]
  def change
    create_table :contractors do |t|
      t.string :sales_number
      t.date :sales_date
      t.float :ammount
      t.integer :cost_center_id
      t.integer :user_id

      t.timestamps
    end
  end
end

class CreateContacts < ActiveRecord::Migration[5.2]
  def change
    create_table :contacts do |t|
      t.string :name
      t.string :email
      t.string :phone
      t.integer :provider_id
      t.string :position
      t.integer :user_id
      t.integer :customer_id

      t.timestamps
    end
  end
end

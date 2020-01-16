class CreateRegisterEdits < ActiveRecord::Migration[5.2]
  def change
    create_table :register_edits do |t|
      t.integer :user_id
      t.integer :register_user_id
      t.string :state
      t.date :date_update
      t.json :editValues
      t.json :newValues
      t.json :oldValues

      t.timestamps
    end
  end
end

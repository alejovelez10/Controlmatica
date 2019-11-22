class CreateAccionModules < ActiveRecord::Migration[5.2]
  def change
    create_table :accion_modules do |t|
      t.string :name
      t.text :description
      t.integer :user_id
      t.integer :module_control_id

      t.timestamps
    end
  end
end

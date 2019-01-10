class CreateParameterizations < ActiveRecord::Migration[5.2]
  def change
    create_table :parameterizations do |t|
      t.string :name
      t.integer :user_id
      t.integer :number_value
      t.integer :money_value

      t.timestamps
    end
  end
end

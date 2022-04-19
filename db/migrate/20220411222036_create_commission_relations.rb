class CreateCommissionRelations < ActiveRecord::Migration[5.2]
  def change
    create_table :commission_relations do |t|
      t.date :creation_date
      t.integer :user_report_id
      t.date :start_date
      t.date :end_date
      t.string :area
      t.text :observations
      t.integer :user_direction_id
      t.integer :last_user_edited_id
      t.integer :user_id

      t.timestamps
    end
  end
end

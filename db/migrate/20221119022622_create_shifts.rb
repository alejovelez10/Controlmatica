class CreateShifts < ActiveRecord::Migration[6.1]
  def change
    create_table :shifts do |t|
      t.integer :user_id
      t.integer :user_responsible_id
      t.date :start_date
      t.date :end_date
      t.integer :cost_center_id

      t.timestamps
    end
  end
end

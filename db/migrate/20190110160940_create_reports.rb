class CreateReports < ActiveRecord::Migration[5.2]
  def change
    create_table :reports do |t|
      t.date :report_date
      t.integer :user_id
      t.integer :working_time
      t.text :work_description
      t.integer :viatic_value
      t.text :viatic_description
      t.integer :total_value
      t.integer :cost_center_id

      t.timestamps
    end
  end
end

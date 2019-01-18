class CreateReports < ActiveRecord::Migration[5.2]
  def change
    create_table :reports do |t|
      t.date :report_date
      t.integer :user_id
      t.integer :working_time
      t.float :working_value
      t.text :work_description
      t.float :viatic_value
      t.text :viatic_description
      t.float :total_value
      t.integer :cost_center_id
      t.integer :report_execute_id
      t.string :report_code

      t.timestamps
    end
  end
end

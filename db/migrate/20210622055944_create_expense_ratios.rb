class CreateExpenseRatios < ActiveRecord::Migration[5.2]
  def change
    create_table :expense_ratios do |t|
      t.date :creation_date
      t.integer :user_report_id
      t.date :start_date
      t.date :end_date
      t.string :area
      t.text :observations
      t.integer :user_direction_id

      t.timestamps
    end
  end
end

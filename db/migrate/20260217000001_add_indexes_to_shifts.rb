class AddIndexesToShifts < ActiveRecord::Migration[5.2]
  def change
    add_index :shifts, :user_responsible_id unless index_exists?(:shifts, :user_responsible_id)
    add_index :shifts, :start_date unless index_exists?(:shifts, :start_date)
    add_index :shifts, :end_date unless index_exists?(:shifts, :end_date)
    add_index :shifts, :user_id unless index_exists?(:shifts, :user_id)
    add_index :shifts, [:user_responsible_id, :start_date, :end_date],
              name: 'index_shifts_on_user_dates' unless index_exists?(:shifts, [:user_responsible_id, :start_date, :end_date], name: 'index_shifts_on_user_dates')
  end
end

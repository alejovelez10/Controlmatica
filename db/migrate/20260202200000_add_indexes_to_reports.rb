class AddIndexesToReports < ActiveRecord::Migration[5.2]
  def change
    add_index :reports, :cost_center_id
    add_index :reports, :customer_id
    add_index :reports, :report_execute_id
    add_index :reports, :report_date
    add_index :reports, :user_id
    add_index :reports, :contact_id
    add_index :reports, :last_user_edited_id
    add_index :reports, :report_sate
  end
end

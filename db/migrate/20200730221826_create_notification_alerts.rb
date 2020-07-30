class CreateNotificationAlerts < ActiveRecord::Migration[5.2]
  def change
    create_table :notification_alerts do |t|
      t.integer :user_id
      t.boolean :state, :default => false
      t.string :module
      t.integer :cost_center_id
      t.text :description
      t.float :expected, :default => 0
      t.float :real, :default => 0
      t.date :date_update
      
      t.timestamps
    end
  end
end

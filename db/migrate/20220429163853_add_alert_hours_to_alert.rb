class AddAlertHoursToAlert < ActiveRecord::Migration[5.2]
  def change
    add_column :alerts, :alert_min, :integer, default: 100
    add_column :alerts, :color_min, :string, default: "#d26666"
    add_column :alerts, :alert_med, :integer, default: 150
    add_column :alerts, :color_mid, :string, default: "#d4b21e"
    add_column :alerts, :alert_max, :integer, default: 151
    add_column :alerts, :color_max, :string, default: "#24bc6b"
  end
end

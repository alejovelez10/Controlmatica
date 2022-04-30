class AddAlertDayToAlert < ActiveRecord::Migration[5.2]
  def change
    add_column :alerts, :alert_hour_min, :integer, default: 100
    add_column :alerts, :alert_hour_med, :integer, default: 100
    add_column :alerts, :alert_hour_max, :integer, default: 100
    add_column :alerts, :color_hour_min, :string, default: "#d26666"
    add_column :alerts, :color_hour_med, :string, default: "#d4b21e"
    add_column :alerts, :color_hour_max, :string, default: "#24bc6b"
    add_column :alerts, :commision_porcentaje, :float
  end
end

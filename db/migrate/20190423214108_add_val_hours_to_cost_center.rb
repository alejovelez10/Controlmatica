class AddValHoursToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :hour_cotizada, :float
    add_column :cost_centers, :hour_real, :float
  end
end

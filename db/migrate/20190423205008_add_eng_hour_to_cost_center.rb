class AddEngHourToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :eng_hours, :float
  end
end

class AddValuesToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :displacement_hours, :float
    add_column :cost_centers, :value_displacement_hours, :float
    add_column :cost_centers, :offset_value, :float
  end
end

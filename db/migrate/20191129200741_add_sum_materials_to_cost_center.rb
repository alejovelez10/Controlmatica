class AddSumMaterialsToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :sum_materials_value, :float, default: 0
  end
end

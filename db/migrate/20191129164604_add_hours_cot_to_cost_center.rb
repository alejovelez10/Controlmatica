class AddHoursCotToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :ingenieria_total_costo, :float, default: 0
    add_column :cost_centers, :sum_materials_costo, :float, default: 0
    add_column :cost_centers, :sum_materials_cot, :float, default: 0
    add_column :cost_centers, :contractor_total_costo, :float, default: 0
    add_column :cost_centers, :sum_contractor_costo, :float, default: 0
    add_column :cost_centers, :sum_contractor_cot, :float, default: 0
  end
end

class AddNewValuesToCostCenter < ActiveRecord::Migration[5.2]
  def change
        add_column :cost_centers, :ing_horas_eje, :float, :default => 0
        add_column :cost_centers, :ing_horas_porcentaje, :float, :default => 0
        add_column :cost_centers, :ing_costo_cotizado, :float, :default => 0
        add_column :cost_centers, :ing_costo_real, :float, :default => 0
        add_column :cost_centers, :ing_costo_porcentaje, :float, :default => 0
        add_column :cost_centers, :cont_horas_eje, :float, :default => 0
        add_column :cost_centers, :cont_horas_porcentaje, :float, :default => 0
        add_column :cost_centers, :cont_costo_cotizado, :float, :default => 0
        add_column :cost_centers, :cont_costo_real, :float, :default => 0
        add_column :cost_centers, :cont_costo_porcentaje, :float, :default => 0
        add_column :cost_centers, :mat_costo_real, :float, :default => 0
        add_column :cost_centers, :mat_costo_porcentaje, :float, :default => 0
        add_column :cost_centers, :viat_costo_real, :float, :default => 0
        add_column :cost_centers, :viat_costo_porcentaje, :float, :default => 0
        add_column :cost_centers, :fact_real, :float, :default => 0
        add_column :cost_centers, :fact_porcentaje, :float, :default => 0
        add_column :cost_centers, :desp_horas_eje, :float, :default => 0
        add_column :cost_centers, :desp_horas_porcentaje, :float, :default => 0
  end
end

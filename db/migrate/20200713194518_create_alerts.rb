class CreateAlerts < ActiveRecord::Migration[5.2]
  def change
    create_table :alerts do |t|
      t.string :name
      t.integer :ing_ejecucion_min
      t.integer :ing_ejecucion_med
      t.integer :ing_ejecucion_max
      t.integer :ing_costo_min
      t.integer :ing_costo_med
      t.integer :ing_costo_max
      t.integer :tab_ejecucion_min
      t.integer :tab_ejecucion_med
      t.integer :tab_ejecucion_max
      t.integer :tab_costo_min
      t.integer :tab_costo_med
      t.integer :tab_costo_max
      t.integer :desp_min
      t.integer :desp_med
      t.integer :desp_max
      t.integer :mat_min
      t.integer :mat_med
      t.integer :mat_max
      t.integer :via_min
      t.integer :via_med
      t.integer :via_max
      t.integer :total_min
      t.integer :total_med
      t.integer :tatal_max
      t.integer :user_id

      t.timestamps
    end
  end
end

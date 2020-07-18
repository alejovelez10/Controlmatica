class AddAuiToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :aiu, :float, default: 0
    add_column :cost_centers, :aiu_percent, :float, default: 0
    add_column :cost_centers, :aiu_real, :float, default: 0
    add_column :cost_centers, :aiu_percent_real, :float, default: 0
    add_column :cost_centers, :total_expenses, :float, default: 0

    #Ex:- :default =>''
  end
end

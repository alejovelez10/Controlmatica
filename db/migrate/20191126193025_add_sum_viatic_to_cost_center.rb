class AddSumViaticToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :sum_viatic, :float
  end
end

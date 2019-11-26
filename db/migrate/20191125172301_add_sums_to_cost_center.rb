class AddSumsToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :sum_materials, :string
    add_column :cost_centers, :sum_contractors, :string
    add_column :cost_centers, :sum_executed, :string
  end
end

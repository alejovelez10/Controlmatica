class AddCreateTypeToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :create_type, :bool
  end
end

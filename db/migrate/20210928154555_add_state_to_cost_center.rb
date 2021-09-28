class AddStateToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :sales_state, :string, :default => "SIN COMPRAS"
  end
end

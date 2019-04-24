class AddTotalValueToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :quotation_value, :float
  end
end

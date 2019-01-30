class AddCountToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :count, :integer
  end
end

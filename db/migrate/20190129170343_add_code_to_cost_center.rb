class AddCodeToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :code, :string
  end
end

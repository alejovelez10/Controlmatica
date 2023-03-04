class AddHasManyQuotesToCostCenter < ActiveRecord::Migration[6.1]
  def change
    add_column :cost_centers, :has_many_quotes, :boolean, default: false
  end
end

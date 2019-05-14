class AddCountToCustormerReport < ActiveRecord::Migration[5.2]
  def change
    add_column :customer_reports, :count, :integer
  end
end

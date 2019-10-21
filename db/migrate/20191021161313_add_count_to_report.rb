class AddCountToReport < ActiveRecord::Migration[5.2]
  def change
    add_column :reports, :count, :integer
  end
end

class AddIdsToContact < ActiveRecord::Migration[5.2]
  def change
    add_column :contacts, :customer_id, :integer
  end
end

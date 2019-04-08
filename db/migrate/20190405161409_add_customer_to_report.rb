class AddCustomerToReport < ActiveRecord::Migration[5.2]
  def change
    add_column :reports, :customer_id, :integer
  end
end

class AddUserToCustomerReport < ActiveRecord::Migration[5.2]
  def change
    add_column :customer_reports, :user_id, :integer
  end
end

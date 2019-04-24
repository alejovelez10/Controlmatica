class AddContactToCustomerReport < ActiveRecord::Migration[5.2]
  def change
    add_column :customer_reports, :contact_id, :integer
  end
end

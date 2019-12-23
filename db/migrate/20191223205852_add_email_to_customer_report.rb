class AddEmailToCustomerReport < ActiveRecord::Migration[5.2]
  def change
    add_column :customer_reports, :email, :string
  end
end

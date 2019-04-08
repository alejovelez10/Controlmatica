class AddInfoToReport < ActiveRecord::Migration[5.2]
  def change
    add_column :reports, :customer_name, :string
    add_column :reports, :contact_name, :string
    add_column :reports, :contact_email, :string
    add_column :reports, :contact_phone, :string
    add_column :reports, :contact_position, :string
  end
end

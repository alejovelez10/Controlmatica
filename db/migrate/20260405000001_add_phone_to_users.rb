class AddPhoneToUsers < ActiveRecord::Migration[6.1]
  def up
    add_column :users, :phone, :string            unless column_exists?(:users, :phone)
    add_column :users, :phone_normalized, :string unless column_exists?(:users, :phone_normalized)

    unless index_exists?(:users, :phone_normalized, name: "index_users_on_phone_normalized")
      add_index :users, :phone_normalized, name: "index_users_on_phone_normalized"
    end
  end

  def down
    if index_exists?(:users, :phone_normalized, name: "index_users_on_phone_normalized")
      remove_index :users, name: "index_users_on_phone_normalized"
    end
    remove_column :users, :phone_normalized if column_exists?(:users, :phone_normalized)
    remove_column :users, :phone            if column_exists?(:users, :phone)
  end
end

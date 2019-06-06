class AddRolUserToUser < ActiveRecord::Migration[5.2]
  def change
    add_column :users, :rol_user, :string
  end
end

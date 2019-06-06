class AddUserIdToRol < ActiveRecord::Migration[5.2]
  def change
    add_column :rols, :user_id, :integer
  end
end

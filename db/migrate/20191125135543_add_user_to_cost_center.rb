class AddUserToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :user_id, :integer
  end
end

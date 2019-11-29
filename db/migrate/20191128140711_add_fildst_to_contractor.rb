class AddFildstToContractor < ActiveRecord::Migration[5.2]
  def change
    add_column :contractors, :description, :text
    add_column :contractors, :hours, :integer
    add_column :contractors, :user_execute_id, :integer
  end
end

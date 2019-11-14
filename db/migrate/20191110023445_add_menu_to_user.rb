class AddMenuToUser < ActiveRecord::Migration[5.2]
  def change
    add_column :users, :menu, :string, :default => "nav-sm"
  end
end

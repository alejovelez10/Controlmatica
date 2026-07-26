class AddIndexToCustomersName < ActiveRecord::Migration[6.1]
  def change
    add_index :customers, :name
    add_index :customers, :code
    add_index :customers, :created_at
  end
end

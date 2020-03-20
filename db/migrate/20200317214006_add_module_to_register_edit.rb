class AddModuleToRegisterEdit < ActiveRecord::Migration[5.2]
  def change
    add_column :register_edits, :module, :string
    add_column :register_edits, :description, :text
  end
end

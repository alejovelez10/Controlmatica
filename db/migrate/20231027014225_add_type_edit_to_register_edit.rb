class AddTypeEditToRegisterEdit < ActiveRecord::Migration[6.1]
  def change
    add_column :register_edits, :type_edit, :string, default: "edito"
  end
end

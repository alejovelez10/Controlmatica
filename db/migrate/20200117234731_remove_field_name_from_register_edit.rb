class RemoveFieldNameFromRegisterEdit < ActiveRecord::Migration[5.2]
  def change
    remove_column :register_edits, :oldValues, :json
  end
end

class AddIndexToAccionModules < ActiveRecord::Migration[5.2]
  def change
    add_index :accion_modules, :module_control_id unless index_exists?(:accion_modules, :module_control_id)
  end
end

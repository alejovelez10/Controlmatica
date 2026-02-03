class AddIndexesToConfigurationTables < ActiveRecord::Migration[6.1]
  def change
    add_index :providers, :name unless index_exists?(:providers, :name)
    add_index :providers, :created_at unless index_exists?(:providers, :created_at)
    add_index :parameterizations, :name unless index_exists?(:parameterizations, :name)
    add_index :parameterizations, :created_at unless index_exists?(:parameterizations, :created_at)
    add_index :rols, :name unless index_exists?(:rols, :name)
    add_index :module_controls, :name unless index_exists?(:module_controls, :name)
    add_index :accion_modules, :module_control_id unless index_exists?(:accion_modules, :module_control_id)
    add_index :accion_modules, :name unless index_exists?(:accion_modules, :name)
    add_index :users, :rol_id unless index_exists?(:users, :rol_id)
    add_index :contacts, :customer_id unless index_exists?(:contacts, :customer_id)
    add_index :contacts, :provider_id unless index_exists?(:contacts, :provider_id)
  end
end

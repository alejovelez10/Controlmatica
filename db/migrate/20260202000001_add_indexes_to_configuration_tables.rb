class AddIndexesToConfigurationTables < ActiveRecord::Migration[6.1]
  def change
    # Providers - búsqueda por nombre, ordenamiento
    add_index :providers, :name
    add_index :providers, :created_at

    # Parameterizations - búsqueda por nombre
    add_index :parameterizations, :name
    add_index :parameterizations, :created_at

    # Rols - búsqueda por nombre
    add_index :rols, :name

    # Module Controls - búsqueda por nombre (muy usada en permisos)
    add_index :module_controls, :name

    # Accion Modules - FK y filtro por módulo (muy usada en permisos)
    add_index :accion_modules, :module_control_id
    add_index :accion_modules, :name

    # Users - FK a rol (join frecuente)
    add_index :users, :rol_id

    # Contacts - FK a customer y provider
    unless index_exists?(:contacts, :customer_id)
      add_index :contacts, :customer_id
    end
    unless index_exists?(:contacts, :provider_id)
      add_index :contacts, :provider_id
    end
  end
end

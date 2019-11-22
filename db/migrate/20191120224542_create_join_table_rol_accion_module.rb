class CreateJoinTableRolAccionModule < ActiveRecord::Migration[5.2]
  def change
    create_join_table :rols, :accion_modules do |t|
      t.index [:rol_id, :accion_module_id]
      t.index [:accion_module_id, :rol_id]
    end
  end
end

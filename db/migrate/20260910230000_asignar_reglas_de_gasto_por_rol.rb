# Las reglas de gasto pasan de asignarse por USUARIO a asignarse por ROL.
#
# POR QUE: mantener la lista persona por persona es trabajo que nadie hace. Cada
# vez que entra alguien nuevo hay que acordarse de agregarlo a la regla, y como
# olvidarlo no produce ningun error —`aplicables_a` cae a la regla por defecto—,
# el olvido no se nota hasta que alguien registra un gasto que debia haberse
# rechazado. El rol ya existe, ya se asigna al crear el usuario y no se olvida.
#
# LA TABLA VIEJA SE BORRA, no se conserva: esta VACIA en desarrollo y en
# produccion (0 filas en ambas, verificado el 2026-09-10), asi que no hay ninguna
# asignacion que migrar. Conservarla solo dejaria dos fuentes para la misma
# pregunta y la duda de cual manda.
class AsignarReglasDeGastoPorRol < ActiveRecord::Migration[6.1]
  def up
    create_table :expense_rules_rols, id: false do |t|
      t.references :expense_rule, null: false, foreign_key: true
      t.references :rol, null: false, foreign_key: true
    end

    add_index :expense_rules_rols, %i[expense_rule_id rol_id],
              unique: true, name: "index_expense_rules_rols_unique"

    drop_table :expense_rules_users
  end

  def down
    create_table :expense_rules_users, id: false do |t|
      t.references :expense_rule, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
    end

    add_index :expense_rules_users, %i[expense_rule_id user_id],
              unique: true, name: "index_expense_rules_users_unique"

    drop_table :expense_rules_rols
  end
end

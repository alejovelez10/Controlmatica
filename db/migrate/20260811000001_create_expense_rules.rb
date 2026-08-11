# Reglas de gastos configurables por usuario (paquete 14).
#
# POR QUE UNA TABLA PROPIA Y NO `parameterizations`: el diseno anterior guardaba
# UNA regla global en filas de parametrizacion. El cliente pidio reglas
# MULTIPLES y asignables a personas distintas, y eso con un almacen clave/valor
# solo se consigue inventando convenciones de nombres.
#
# La tabla mezcla a proposito dos naturalezas distintas:
#   * DETERMINISTA (max_invoice_age_days, max_invoice_value, check_duplicates):
#     la evalua el servidor, siempre, venga el gasto por la web o por MCP.
#   * SEMANTICA (agent_instructions): texto libre que NO se evalua aqui; se
#     expone para que lo interprete el agente de Taimes.
# Si lo determinista se moviera al prompt del agente, un gasto creado por la web
# dejaria de validarse y apareceria una asimetria entre canales.
#
# Sin foreign keys, igual que el resto del esquema: la primera romperia el orden
# de borrado de `fixtures :all`. La integridad la valida el modelo.
class CreateExpenseRules < ActiveRecord::Migration[6.1]
  # Nombre del indice unico parcial que garantiza "una sola regla por defecto
  # activa". Se escribe con SQL crudo porque `add_index ... where:` de Rails 6.1
  # si lo soporta, pero el `index_exists?` de la guarda de idempotencia NO
  # distingue indices parciales: se compara por nombre.
  INDICE_DEFAULT_UNICO = "index_expense_rules_unique_default_active".freeze

  def up
    unless table_exists?(:expense_rules)
      create_table :expense_rules do |t|
        t.string   :name,                 null: false
        t.boolean  :active,               null: false, default: true
        t.boolean  :is_default,           null: false, default: false
        # nil = sin limite de antiguedad. No es lo mismo que 0, que rechazaria
        # toda factura que no sea de hoy.
        t.integer  :max_invoice_age_days
        # nil = sin tope. decimal y no float: es plata.
        t.decimal  :max_invoice_value,    precision: 15, scale: 2
        t.boolean  :check_duplicates,     null: false, default: true
        t.text     :agent_instructions
        t.integer  :user_id
        t.integer  :last_user_edited_id
        t.timestamps
      end
    end

    unless index_exists?(:expense_rules, :active, name: "index_expense_rules_on_active")
      add_index :expense_rules, :active, name: "index_expense_rules_on_active"
    end

    unless index_exists?(:expense_rules, :is_default, name: "index_expense_rules_on_is_default")
      add_index :expense_rules, :is_default, name: "index_expense_rules_on_is_default"
    end

    # El modelo tambien valida "solo una default activa", pero una validacion de
    # Rails no es atomica: dos peticiones simultaneas pasan las dos. El indice
    # unico parcial es lo unico que lo garantiza de verdad.
    unless index_name_exists?(:expense_rules, INDICE_DEFAULT_UNICO)
      add_index :expense_rules, :is_default, unique: true, name: INDICE_DEFAULT_UNICO,
                                             where: "is_default AND active"
    end

    # Tabla puente HABTM SIN MODELO, igual que accion_modules_rols, que ya existe
    # en el repo. `id: false` porque un HABTM sin modelo no usa la clave primaria
    # y crearla solo gasta espacio.
    unless table_exists?(:expense_rules_users)
      create_table :expense_rules_users, id: false do |t|
        t.integer :expense_rule_id, null: false
        t.integer :user_id,         null: false
      end
    end

    unless index_exists?(:expense_rules_users, :expense_rule_id, name: "index_expense_rules_users_on_expense_rule_id")
      add_index :expense_rules_users, :expense_rule_id, name: "index_expense_rules_users_on_expense_rule_id"
    end

    unless index_exists?(:expense_rules_users, :user_id, name: "index_expense_rules_users_on_user_id")
      add_index :expense_rules_users, :user_id, name: "index_expense_rules_users_on_user_id"
    end

    # El unico compuesto no es cosmetico: sin el, guardar dos veces el mismo
    # formulario duplica las filas del puente y `aplicables_a` devuelve la misma
    # regla dos veces, con lo que las instrucciones del agente salen repetidas.
    unless index_exists?(:expense_rules_users, %i[expense_rule_id user_id],
                         name: "index_expense_rules_users_unique")
      add_index :expense_rules_users, %i[expense_rule_id user_id], unique: true,
                                                                   name: "index_expense_rules_users_unique"
    end
  end

  def down
    # Los indices se van con sus tablas.
    drop_table :expense_rules_users, if_exists: true
    drop_table :expense_rules, if_exists: true
  end
end

# Crea la tabla de partidas presupuestales por (centro de costo, usuario beneficiario).
#
# OJO: `user_id` es el BENEFICIARIO de la partida, no quien la crea. El creador es
# `created_by_id`. Renombrarlo "por consistencia" rompe el join central del proyecto
# (`expense_budgets.user_id = report_expenses.user_invoice_id`).
#
# Sin foreign keys a proposito: el esquema del proyecto no tiene ninguna y la primera
# rompeeria el orden de borrado de `fixtures :all`. La integridad la valida el modelo.
# Sin indice unico: se permiten varias partidas por (centro, usuario); el cupo se
# controla por agregado.
class CreateExpenseBudgets < ActiveRecord::Migration[6.1]
  def up
    unless table_exists?(:expense_budgets)
      create_table :expense_budgets do |t|
        t.integer  :cost_center_id,      null: false
        t.integer  :user_id,             null: false
        t.decimal  :amount,              precision: 15, scale: 2, null: false, default: 0.0
        t.text     :notes
        t.boolean  :active,              null: false, default: true
        t.integer  :created_by_id
        t.integer  :last_user_edited_id
        t.timestamps
      end
    end

    unless index_exists?(:expense_budgets, %i[cost_center_id user_id active],
                         name: "index_expense_budgets_on_center_user_active")
      add_index :expense_budgets, %i[cost_center_id user_id active],
                name: "index_expense_budgets_on_center_user_active"
    end

    unless index_exists?(:expense_budgets, :cost_center_id, name: "index_expense_budgets_on_cost_center_id")
      add_index :expense_budgets, :cost_center_id, name: "index_expense_budgets_on_cost_center_id"
    end

    unless index_exists?(:expense_budgets, :user_id, name: "index_expense_budgets_on_user_id")
      add_index :expense_budgets, :user_id, name: "index_expense_budgets_on_user_id"
    end
  end

  def down
    # Los tres indices se van con la tabla.
    drop_table :expense_budgets, if_exists: true
  end
end

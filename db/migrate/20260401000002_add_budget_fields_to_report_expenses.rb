# Cablea el gasto con su partida presupuestal.
#
# ESTA migracion ES la migracion de datos historicos de la parte presupuestal: el
# `default: "sin_presupuesto"` con `null: false` backfillea las filas existentes dentro
# del mismo ALTER TABLE. No lleva —ni debe llevar— ningun UPDATE sobre report_expenses.
#
# Valores permitidos de `budget_status` (la validacion vive en el modelo, no en la BD):
# "sin_presupuesto", "aprobado", "excedido".
class AddBudgetFieldsToReportExpenses < ActiveRecord::Migration[6.1]
  def up
    unless column_exists?(:report_expenses, :expense_budget_id)
      add_column :report_expenses, :expense_budget_id, :integer
    end

    unless column_exists?(:report_expenses, :budget_status)
      add_column :report_expenses, :budget_status, :string, null: false, default: "sin_presupuesto"
    end

    unless column_exists?(:report_expenses, :budget_reason)
      add_column :report_expenses, :budget_reason, :string
    end

    unless index_exists?(:report_expenses, :expense_budget_id,
                         name: "index_report_expenses_on_expense_budget_id")
      add_index :report_expenses, :expense_budget_id,
                name: "index_report_expenses_on_expense_budget_id"
    end

    # El indice de budget_status parece inutil (cardinalidad 3, 100% en "sin_presupuesto"
    # tras migrar) pero sirve al caso selectivo `WHERE budget_status = 'excedido'`.
    unless index_exists?(:report_expenses, :budget_status,
                         name: "index_report_expenses_on_budget_status")
      add_index :report_expenses, :budget_status,
                name: "index_report_expenses_on_budget_status"
    end
  end

  def down
    if index_exists?(:report_expenses, :budget_status, name: "index_report_expenses_on_budget_status")
      remove_index :report_expenses, name: "index_report_expenses_on_budget_status"
    end

    if index_exists?(:report_expenses, :expense_budget_id, name: "index_report_expenses_on_expense_budget_id")
      remove_index :report_expenses, name: "index_report_expenses_on_expense_budget_id"
    end

    remove_column :report_expenses, :budget_reason     if column_exists?(:report_expenses, :budget_reason)
    remove_column :report_expenses, :budget_status     if column_exists?(:report_expenses, :budget_status)
    remove_column :report_expenses, :expense_budget_id if column_exists?(:report_expenses, :expense_budget_id)
  end
end

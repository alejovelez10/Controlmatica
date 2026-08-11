# Campos de aprobacion contable del gasto.
#
# ESTA migracion ES la migracion de datos historicos de la parte contable: el
# `default: false` deja todos los gastos existentes sin aprobar. No se inventan
# aprobaciones retroactivas y no hay ningun UPDATE.
#
# `is_acepted` NO se toca: ni su tipo, ni su default, ni su indice, ni sus valores. Es
# la aceptacion operativa que ya existia y es independiente de la contable.
class AddAccountingFieldsToReportExpenses < ActiveRecord::Migration[6.1]
  def up
    unless column_exists?(:report_expenses, :accounting_approved)
      add_column :report_expenses, :accounting_approved, :boolean, null: false, default: false
    end

    unless column_exists?(:report_expenses, :accounting_approved_by_id)
      add_column :report_expenses, :accounting_approved_by_id, :integer
    end

    unless column_exists?(:report_expenses, :accounting_approved_at)
      add_column :report_expenses, :accounting_approved_at, :datetime
    end

    unless index_exists?(:report_expenses, %i[accounting_approved invoice_date],
                         name: "index_report_expenses_on_accounting_approved_and_date")
      add_index :report_expenses, %i[accounting_approved invoice_date],
                name: "index_report_expenses_on_accounting_approved_and_date"
    end
  end

  def down
    if index_exists?(:report_expenses, %i[accounting_approved invoice_date],
                     name: "index_report_expenses_on_accounting_approved_and_date")
      remove_index :report_expenses, name: "index_report_expenses_on_accounting_approved_and_date"
    end

    remove_column :report_expenses, :accounting_approved_at    if column_exists?(:report_expenses, :accounting_approved_at)
    remove_column :report_expenses, :accounting_approved_by_id if column_exists?(:report_expenses, :accounting_approved_by_id)
    remove_column :report_expenses, :accounting_approved       if column_exists?(:report_expenses, :accounting_approved)
  end
end

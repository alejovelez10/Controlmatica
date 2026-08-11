# Campos de multimoneda del gasto.
#
# ESTA migracion ES la migracion de datos historicos de la parte multimoneda:
# `null: false` + `default: "COP"` deja todos los gastos existentes en pesos sin un solo
# UPDATE. Los seis campos `foreign_*` / `exchange_rate*` quedan NULL en los historicos,
# que es lo correcto: no hubo conversion.
#
# NO se tocan `invoice_value`, `invoice_tax` ni `invoice_total`: siguen siendo float y
# siguen estando en COP. Pasarlos a decimal rompe `recalculate_cost_center` y corrompe
# el porcentaje de viaticos de todos los centros de costo.
#
# El indice compuesto (invoice_number, identification) sirve a la regla de duplicados del
# motor de reglas, no a multimoneda; se ubica aqui por decision de la arquitectura.
class AddCurrencyFieldsToReportExpenses < ActiveRecord::Migration[6.1]
  def up
    unless column_exists?(:report_expenses, :currency)
      add_column :report_expenses, :currency, :string, null: false, default: "COP"
    end

    unless column_exists?(:report_expenses, :foreign_value)
      add_column :report_expenses, :foreign_value, :decimal, precision: 15, scale: 2
    end

    unless column_exists?(:report_expenses, :foreign_tax)
      add_column :report_expenses, :foreign_tax, :decimal, precision: 15, scale: 2
    end

    unless column_exists?(:report_expenses, :foreign_total)
      add_column :report_expenses, :foreign_total, :decimal, precision: 15, scale: 2
    end

    unless column_exists?(:report_expenses, :exchange_rate)
      add_column :report_expenses, :exchange_rate, :decimal, precision: 18, scale: 6
    end

    unless column_exists?(:report_expenses, :exchange_rate_date)
      add_column :report_expenses, :exchange_rate_date, :date
    end

    unless column_exists?(:report_expenses, :exchange_rate_source)
      add_column :report_expenses, :exchange_rate_source, :string
    end

    # `name:` es OBLIGATORIO en el guard: index_exists? no compara el predicado `where`,
    # asi que sin nombre responderia por el indice equivocado.
    unless index_exists?(:report_expenses, :currency,
                         name: "index_report_expenses_on_foreign_currency")
      add_index :report_expenses, :currency,
                where: "currency <> 'COP'",
                name: "index_report_expenses_on_foreign_currency"
    end

    unless index_exists?(:report_expenses, %i[invoice_number identification],
                         name: "index_report_expenses_on_invoice_number_and_identification")
      add_index :report_expenses, %i[invoice_number identification],
                name: "index_report_expenses_on_invoice_number_and_identification"
    end
  end

  def down
    if index_exists?(:report_expenses, %i[invoice_number identification],
                     name: "index_report_expenses_on_invoice_number_and_identification")
      remove_index :report_expenses, name: "index_report_expenses_on_invoice_number_and_identification"
    end

    if index_exists?(:report_expenses, :currency, name: "index_report_expenses_on_foreign_currency")
      remove_index :report_expenses, name: "index_report_expenses_on_foreign_currency"
    end

    remove_column :report_expenses, :exchange_rate_source if column_exists?(:report_expenses, :exchange_rate_source)
    remove_column :report_expenses, :exchange_rate_date   if column_exists?(:report_expenses, :exchange_rate_date)
    remove_column :report_expenses, :exchange_rate        if column_exists?(:report_expenses, :exchange_rate)
    remove_column :report_expenses, :foreign_total        if column_exists?(:report_expenses, :foreign_total)
    remove_column :report_expenses, :foreign_tax          if column_exists?(:report_expenses, :foreign_tax)
    remove_column :report_expenses, :foreign_value        if column_exists?(:report_expenses, :foreign_value)
    remove_column :report_expenses, :currency             if column_exists?(:report_expenses, :currency)
  end
end

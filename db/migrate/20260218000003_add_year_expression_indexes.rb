class AddYearExpressionIndexes < ActiveRecord::Migration[5.2]
  # CONCURRENTLY requiere deshabilitar DDL transactions
  disable_ddl_transaction!

  def change
    # Índices de expresión para queries con EXTRACT(YEAR FROM date)
    # Estos permiten que PostgreSQL use índices en queries como:
    # WHERE EXTRACT(YEAR FROM start_date) = 2026

    # cost_centers - ya tiene índice en start_date pero necesita expression index para YEAR
    execute <<-SQL
      CREATE INDEX CONCURRENTLY IF NOT EXISTS index_cost_centers_on_start_date_year
      ON cost_centers (EXTRACT(YEAR FROM start_date))
    SQL

    # materials - no tiene índice en sales_date
    execute <<-SQL
      CREATE INDEX CONCURRENTLY IF NOT EXISTS index_materials_on_sales_date_year
      ON materials (EXTRACT(YEAR FROM sales_date))
    SQL

    # Índice compuesto para GROUP BY mes
    execute <<-SQL
      CREATE INDEX CONCURRENTLY IF NOT EXISTS index_materials_on_sales_date_year_month
      ON materials (EXTRACT(YEAR FROM sales_date), EXTRACT(MONTH FROM sales_date))
    SQL

    # contractors - no tiene índice en sales_date
    execute <<-SQL
      CREATE INDEX CONCURRENTLY IF NOT EXISTS index_contractors_on_sales_date_year
      ON contractors (EXTRACT(YEAR FROM sales_date))
    SQL

    execute <<-SQL
      CREATE INDEX CONCURRENTLY IF NOT EXISTS index_contractors_on_sales_date_year_month
      ON contractors (EXTRACT(YEAR FROM sales_date), EXTRACT(MONTH FROM sales_date))
    SQL

    # reports - tiene índice en report_date pero necesita expression index
    execute <<-SQL
      CREATE INDEX CONCURRENTLY IF NOT EXISTS index_reports_on_report_date_year
      ON reports (EXTRACT(YEAR FROM report_date))
    SQL

    execute <<-SQL
      CREATE INDEX CONCURRENTLY IF NOT EXISTS index_reports_on_report_date_year_month
      ON reports (EXTRACT(YEAR FROM report_date), EXTRACT(MONTH FROM report_date))
    SQL

    # customer_invoices
    execute <<-SQL
      CREATE INDEX CONCURRENTLY IF NOT EXISTS index_customer_invoices_on_invoice_date_year
      ON customer_invoices (EXTRACT(YEAR FROM invoice_date))
    SQL
  end

  def down
    execute "DROP INDEX IF EXISTS index_cost_centers_on_start_date_year"
    execute "DROP INDEX IF EXISTS index_materials_on_sales_date_year"
    execute "DROP INDEX IF EXISTS index_materials_on_sales_date_year_month"
    execute "DROP INDEX IF EXISTS index_contractors_on_sales_date_year"
    execute "DROP INDEX IF EXISTS index_contractors_on_sales_date_year_month"
    execute "DROP INDEX IF EXISTS index_reports_on_report_date_year"
    execute "DROP INDEX IF EXISTS index_reports_on_report_date_year_month"
    execute "DROP INDEX IF EXISTS index_customer_invoices_on_invoice_date_year"
  end
end

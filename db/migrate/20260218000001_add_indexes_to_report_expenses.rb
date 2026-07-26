class AddIndexesToReportExpenses < ActiveRecord::Migration[5.2]
  def change
    add_index :report_expenses, :user_invoice_id unless index_exists?(:report_expenses, :user_invoice_id)
    add_index :report_expenses, :invoice_date unless index_exists?(:report_expenses, :invoice_date)
    add_index :report_expenses, :is_acepted unless index_exists?(:report_expenses, :is_acepted)
    add_index :report_expenses, :type_identification_id unless index_exists?(:report_expenses, :type_identification_id)
    add_index :report_expenses, :payment_type_id unless index_exists?(:report_expenses, :payment_type_id)
    add_index :report_expenses, :created_at unless index_exists?(:report_expenses, :created_at)
  end
end

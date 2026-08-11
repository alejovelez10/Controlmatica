# Columna del comprobante del gasto.
#
# Tipo :string porque es lo que espera CarrierWave, igual que `sales_orders.order_file`
# y `customer_invoices.delivery_certificate_file`. Sin indice: nunca se filtra por el
# nombre del archivo. El `mount_uploader :receipt_file, ReceiptUploader` lo agrega el
# paquete de Comprobante, no esta migracion.
class AddReceiptFileToReportExpenses < ActiveRecord::Migration[6.1]
  def up
    unless column_exists?(:report_expenses, :receipt_file)
      add_column :report_expenses, :receipt_file, :string
    end
  end

  def down
    remove_column :report_expenses, :receipt_file if column_exists?(:report_expenses, :receipt_file)
  end
end

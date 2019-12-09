class AddNumberInvoiceToCustomerInvoice < ActiveRecord::Migration[5.2]
  def change
    add_column :customer_invoices, :number_invoice, :string
  end
end

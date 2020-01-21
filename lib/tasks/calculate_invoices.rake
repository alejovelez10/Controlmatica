namespace :calculate_invoices do
  desc "Sends the most voted products created yesterday"
  task create: :environment do
    SalesOrder.all.each do |sale|
      total = sale.customer_invoices.sum(:invoice_value)
      sale.sum_invoices = total
      sale.save
    end
  end
end

# == Schema Information
#
# Table name: customer_invoices
#
#  id                         :bigint           not null, primary key
#  cost_center_id             :integer
#  sales_order_id             :integer
#  invoice_value              :float
#  invoice_date               :date
#  delivery_certificate_file  :string
#  delivery_certificate_state :string
#  reception_report_file      :string
#  reception_report_state     :string
#  invoice_state              :string
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  number_invoice             :string
#

class CustomerInvoice < ApplicationRecord
  mount_uploader :delivery_certificate_file, CertificateUploader
  mount_uploader :reception_report_file, InformationUploader
  belongs_to :cost_center, optional: true
  belongs_to :sales_order

  after_save :change_state_cost_center
  after_destroy :update_value

  def change_state_cost_center
    cost_center = CostCenter.find(self.cost_center_id)
    sales_order = SalesOrder.find(self.sales_order_id)

    sales_order.update(sum_invoices: sales_order.customer_invoices.sum(:invoice_value))

    customer_invoice = CustomerInvoice.where(cost_center_id: self.cost_center_id).sum(:invoice_value)
    if (cost_center.quotation_value <= customer_invoice)
      CostCenter.find(self.cost_center_id).update(invoiced_state: "FACTURADO")
    elsif (customer_invoice > 0 && customer_invoice < cost_center.quotation_value)
      CostCenter.find(self.cost_center_id).update(invoiced_state: "FACTURADO PARCIAL")
    end
  end

  def update_value
    sales_order = SalesOrder.find(self.sales_order_id)
    sales_order.update(sum_invoices: sales_order.customer_invoices.sum(:invoice_value))
  end
  
end

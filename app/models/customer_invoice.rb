# == Schema Information
#
# Table name: customer_invoices
#
#  id                         :bigint           not null, primary key
#  delivery_certificate_file  :string
#  delivery_certificate_state :string
#  engineering_value          :float            default(0.0)
#  invoice_date               :date
#  invoice_state              :string
#  invoice_value              :float
#  number_invoice             :string
#  others_value               :float            default(0.0)
#  reception_report_file      :string
#  reception_report_state     :string
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  cost_center_id             :integer
#  sales_order_id             :integer
#
# Indexes
#
#  index_customer_invoices_on_cost_center_id  (cost_center_id)
#

class CustomerInvoice < ApplicationRecord
  mount_uploader :delivery_certificate_file, CertificateUploader
  mount_uploader :reception_report_file, InformationUploader
  belongs_to :cost_center, optional: true
  belongs_to :sales_order

  after_save :change_state_cost_center
  after_destroy :update_value
  after_create :calculate_sum
  after_update :calculate_sum

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

  def calculate_sum
    self.others_value = (self.invoice_value - self.engineering_value)
  end

  def update_value
    sales_order = SalesOrder.find(self.sales_order_id)
    sales_order.update(sum_invoices: sales_order.customer_invoices.sum(:invoice_value))
    cost_center = CostCenter.find(sales_order.cost_center_id)
    customer_invoice = CustomerInvoice.where(cost_center_id: sales_order.cost_center_id).sum(:invoice_value)
    sales_order_sum = SalesOrder.where(cost_center_id: self.cost_center_id).sum(:order_value)
    if (cost_center.quotation_value <= customer_invoice)
      CostCenter.find(sales_order.cost_center_id).update(invoiced_state: "FACTURADO")
    elsif (customer_invoice > 0 && customer_invoice < cost_center.quotation_value)
      CostCenter.find(sales_order.cost_center_id).update(invoiced_state: "FACTURADO PARCIAL")
    elsif (customer_invoice <= 0)
      if (cost_center.quotation_value <= sales_order_sum + 1000 && customer_invoice == 0)
        CostCenter.find(self.cost_center_id).update(invoiced_state: "LEGALIZADO")
      elsif (sales_order_sum > 0 && sales_order_sum < cost_center.quotation_value && sales_order_sum == 0 && customer_invoice == 0)
        CostCenter.find(self.cost_center_id).update(invoiced_state: "LEGALIZADO PARCIAL")
      elsif (sales_order_sum == 0 && customer_invoice == 0)
        CostCenter.find(self.cost_center_id).update(invoiced_state: "PENDIENTE DE ORDEN DE COMPRA")
      end
    end
  end
end

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
#

class CustomerInvoiceSerializer < ActiveModel::Serializer
  attributes :id, :cost_center_id, :sales_order_id, :invoice_value, :invoice_date, :delivery_certificate_file, :delivery_certificate_state, :reception_report_file, :reception_report_state, :invoice_state
end

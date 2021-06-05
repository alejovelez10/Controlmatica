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

require 'test_helper'

class CustomerInvoiceTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

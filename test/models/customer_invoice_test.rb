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

require 'test_helper'

class CustomerInvoiceTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

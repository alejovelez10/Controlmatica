# == Schema Information
#
# Table name: report_expenses
#
#  id                  :bigint           not null, primary key
#  user_id             :integer
#  cost_center_id      :integer
#  user_invoice_id     :integer
#  invoice_name        :string
#  invoice_date        :date
#  type_identification :string
#  description         :text
#  invoice_number      :string
#  invoice_type        :string
#  payment_type        :string
#  invoice_value       :float            default(0.0)
#  invoice_tax         :float            default(0.0)
#  invoice_total       :float            default(0.0)
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#

require 'test_helper'

class ReportExpenseTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

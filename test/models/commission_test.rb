# == Schema Information
#
# Table name: commissions
#
#  id                  :bigint           not null, primary key
#  end_date            :date
#  hours_worked        :float
#  is_acepted          :boolean          default(FALSE)
#  observation         :text
#  start_date          :date
#  total_value         :float
#  value_hour          :float
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  cost_center_id      :integer
#  customer_invoice_id :integer
#  customer_report_id  :integer
#  last_user_edited_id :integer
#  user_id             :integer
#  user_invoice_id     :integer
#
require 'test_helper'

class CommissionTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

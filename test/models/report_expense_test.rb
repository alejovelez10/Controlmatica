# == Schema Information
#
# Table name: report_expenses
#
#  id                     :bigint           not null, primary key
#  description            :text
#  identification         :string
#  invoice_date           :date
#  invoice_name           :string
#  invoice_number         :string
#  invoice_tax            :float            default(0.0)
#  invoice_total          :float            default(0.0)
#  invoice_type           :string
#  invoice_value          :float            default(0.0)
#  is_acepted             :boolean          default(FALSE)
#  payment_type           :string
#  type_identification    :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  cost_center_id         :integer
#  last_user_edited_id    :integer
#  payment_type_id        :integer
#  type_identification_id :integer
#  user_id                :integer
#  user_invoice_id        :integer
#
# Indexes
#
#  index_report_expenses_on_cost_center_id          (cost_center_id)
#  index_report_expenses_on_created_at              (created_at)
#  index_report_expenses_on_invoice_date            (invoice_date)
#  index_report_expenses_on_is_acepted              (is_acepted)
#  index_report_expenses_on_payment_type_id         (payment_type_id)
#  index_report_expenses_on_type_identification_id  (type_identification_id)
#  index_report_expenses_on_user_id                 (user_id)
#  index_report_expenses_on_user_invoice_id         (user_invoice_id)
#

require 'test_helper'

class ReportExpenseTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

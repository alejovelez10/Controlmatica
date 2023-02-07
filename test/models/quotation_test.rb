# == Schema Information
#
# Table name: quotations
#
#  id                        :bigint           not null, primary key
#  description               :text
#  displacement_hours        :float
#  eng_hours                 :float
#  hour_cotizada             :float
#  hour_real                 :float
#  hours_contractor          :float
#  hours_contractor_invoices :float
#  hours_contractor_real     :float
#  materials_value           :float
#  quotation_number          :string
#  quotation_value           :float
#  value_displacement_hours  :float
#  viatic_value              :float
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  cost_center_id            :integer
#
require "test_helper"

class QuotationTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

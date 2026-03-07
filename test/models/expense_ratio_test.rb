# == Schema Information
#
# Table name: expense_ratios
#
#  id                  :bigint           not null, primary key
#  anticipo            :float
#  area                :string
#  creation_date       :date
#  end_date            :date
#  observations        :text
#  start_date          :date
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  last_user_edited_id :integer
#  user_direction_id   :integer
#  user_id             :integer
#  user_report_id      :integer
#
# Indexes
#
#  index_expense_ratios_on_user_id  (user_id)
#

require 'test_helper'

class ExpenseRatioTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

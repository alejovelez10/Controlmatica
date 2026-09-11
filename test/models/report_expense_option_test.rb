# == Schema Information
#
# Table name: report_expense_options
#
#  id         :bigint           not null, primary key
#  category   :string
#  name       :string
#  used_by_ai :boolean          default(TRUE), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :integer
#

require 'test_helper'

class ReportExpenseOptionTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

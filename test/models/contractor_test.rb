# == Schema Information
#
# Table name: contractors
#
#  id                  :bigint           not null, primary key
#  ammount             :float
#  description         :text
#  hours               :float
#  sales_date          :date
#  sales_number        :string
#  update_user         :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  cost_center_id      :integer
#  last_user_edited_id :integer
#  user_execute_id     :integer
#  user_id             :integer
#

require 'test_helper'

class ContractorTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

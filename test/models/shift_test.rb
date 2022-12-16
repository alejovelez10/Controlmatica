# == Schema Information
#
# Table name: shifts
#
#  id                  :bigint           not null, primary key
#  description         :text
#  end_date            :datetime
#  start_date          :datetime
#  subject             :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  cost_center_id      :integer
#  user_id             :integer
#  user_responsible_id :integer
#
require "test_helper"

class ShiftTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

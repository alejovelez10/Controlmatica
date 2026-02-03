# == Schema Information
#
# Table name: shifts
#
#  id                  :bigint           not null, primary key
#  color               :string           default("#1aa9fb")
#  description         :text
#  end_date            :datetime
#  force_save          :boolean          default(FALSE)
#  start_date          :datetime
#  subject             :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  cost_center_id      :integer
#  microsoft_id        :string
#  user_id             :integer
#  user_responsible_id :integer
#
# Indexes
#
#  index_shifts_on_cost_center_id  (cost_center_id)
#
require "test_helper"

class ShiftTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

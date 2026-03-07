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
#  index_shifts_on_cost_center_id       (cost_center_id)
#  index_shifts_on_end_date             (end_date)
#  index_shifts_on_start_date           (start_date)
#  index_shifts_on_user_dates           (user_responsible_id,start_date,end_date)
#  index_shifts_on_user_id              (user_id)
#  index_shifts_on_user_responsible_id  (user_responsible_id)
#
require "test_helper"

class ShiftTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

# == Schema Information
#
# Table name: shifts
#
#  id                  :bigint           not null, primary key
#  end_date            :date
#  start_date          :date
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  cost_center_id      :integer
#  user_id             :integer
#  user_responsible_id :integer
#
class Shift < ApplicationRecord
    belongs_to :user
    belongs_to :cost_center
    belongs_to :user_responsible, class_name: "User"
end

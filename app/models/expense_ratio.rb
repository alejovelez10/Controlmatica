# == Schema Information
#
# Table name: expense_ratios
#
#  id                :bigint           not null, primary key
#  creation_date     :date
#  user_report_id    :integer
#  start_date        :date
#  end_date          :date
#  area              :string
#  observations      :text
#  user_direction_id :integer
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#

class ExpenseRatio < ApplicationRecord
    belongs_to :user_report, class_name: "User"
    belongs_to :user_direction, class_name: "User"
end

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

class ExpenseRatioSerializer < ActiveModel::Serializer
  attributes :id, :creation_date, :user_report_id, :start_date, :end_date, :area, :observations, :user_direction_id
  belongs_to :user_report, serializer: UserSerializer
  belongs_to :user_direction, serializer: UserSerializer
end

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

class ExpenseRatioSerializer < ActiveModel::Serializer
  attributes :id, :creation_date, :user_report_id, :start_date, :end_date, :area, :observations, :user_direction_id, :updated_at, :created_at, :anticipo
  belongs_to :user_report, serializer: UserSerializer
  belongs_to :user_direction, serializer: UserSerializer
  belongs_to :last_user_edited, serializer: UserSerializer
  belongs_to :user, serializer: UserSerializer

end

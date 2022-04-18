# == Schema Information
#
# Table name: commission_relations
#
#  id                  :bigint           not null, primary key
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
class CommissionRelationSerializer < ActiveModel::Serializer
  attributes :id, :start_date, :observations, :end_date, :creation_date, :area, :created_at, :updated_at
  belongs_to :user_report, serializer: UserSerializer
  belongs_to :user_direction, serializer: UserSerializer
  belongs_to :last_user_edited, serializer: UserSerializer
  belongs_to :user, serializer: UserSerializer
end

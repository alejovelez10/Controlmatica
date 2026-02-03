# == Schema Information
#
# Table name: notification_alerts
#
#  id             :bigint           not null, primary key
#  date_update    :date
#  description    :text
#  expected       :float            default(0.0)
#  module         :string
#  real           :float            default(0.0)
#  state          :boolean          default(FALSE)
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  cost_center_id :integer
#  user_id        :integer
#
# Indexes
#
#  index_notification_alerts_on_cost_center_id  (cost_center_id)
#

class NotificationAlertSerializer < ActiveModel::Serializer
  attributes :id
end

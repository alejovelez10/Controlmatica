# == Schema Information
#
# Table name: notification_alerts
#
#  id             :bigint           not null, primary key
#  user_id        :integer
#  state          :boolean          default(FALSE)
#  module         :string
#  cost_center_id :integer
#  description    :text
#  expected       :float            default(0.0)
#  real           :float            default(0.0)
#  date_update    :date
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#

class NotificationAlert < ApplicationRecord
  belongs_to :user
  belongs_to :cost_center, optional: true
end

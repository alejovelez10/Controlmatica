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
class ShiftSerializer < ActiveModel::Serializer
  attributes :id, :end_date, :start_date, :subject, :description, :cost_center, :user_responsible, :users, :color, :force_save

  def user_responsible
    if object.user_responsible_id.present?
      {
        id: object.user_responsible.id,
        names: object.user_responsible.names,
      }
    else
      nil
    end
  end

  def cost_center
    {
      id: object.cost_center.id,
      code: object.cost_center.code,
    }
  end

  def users
    object.users.collect do |user|
			{
        :label => user.names,
        :value => user.id,
			}
		end
  end
end

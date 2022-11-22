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
class ShiftSerializer < ActiveModel::Serializer
  attributes :id, :end_date, :start_date, :cost_center, :user_responsible

  def user_responsible
    {
      id: object.user_responsible.id,
      names: object.user_responsible.names,
    }
  end

  def cost_center
    {
      id: object.cost_center.id,
      code: object.cost_center.code,
    }
  end

end

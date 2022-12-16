# == Schema Information
#
# Table name: shifts
#
#  id                  :bigint           not null, primary key
#  description         :text
#  end_date            :datetime
#  start_date          :datetime
#  subject             :string
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
    has_and_belongs_to_many :users
    after_create :create_shift

    def create_shift
        if self.users.any?
            self.users.each do |user|
                Shift.create(
                    start_date: self.start_date,
                    end_date: self.end_date,
                    cost_center_id: self.cost_center_id,
                    user_id: self.user_id,
                    user_responsible_id: user.id,
                )
            end
        end
    end

    def self.search(search1, search2, search3, search4)
        search1 != "" ? (scope :fecha_comienzo, -> { where(start_date: search1) }) : (scope :fecha_comienzo, -> { where.not(id: nil) })
        search2 != "" ? (scope :fecha_final, -> { where(end_date: search2) }) : (scope :fecha_final, -> { where.not(id: nil) })
        search3 != "" ? (scope :centro_de_costo, -> { where(cost_center_id: search3) }) : (scope :centro_de_costo, -> { where.not(id: nil) })
        search4 != "" ? (scope :usuario_responsable, -> { where(user_responsible_id: search4) }) : (scope :usuario_responsable, -> { where.not(id: nil) })

        fecha_comienzo.fecha_final.centro_de_costo.usuario_responsable
    end
end

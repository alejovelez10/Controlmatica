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
class Shift < ApplicationRecord
    belongs_to :user
    belongs_to :cost_center
    belongs_to :user_responsible, class_name: "User", optional: true
    has_and_belongs_to_many :users
    after_create :create_shift

    def create_shift
      #  if self.users.any?
      #      self.users.each do |user|
      #          Shift.create(
      #              start_date: self.start_date,
      #              end_date: self.end_date,
      #              cost_center_id: self.cost_center_id,
      #              user_id: self.user_id,
      #              user_responsible_id: user.id,
      #          )
      #      end
      #  end

      #  if self.user_responsible_id.nil?
       #     Shift.find(self.id).destroy
        #    #DeleteShiftJob.set(wait: 5.seconds).perform_later(self)
       # end
    end

    def self.search(start_date, end_date, cost_center_ids, user_responsible_ids)
        puts "cost_center_idscost_center_idscost_center_ids #{cost_center_ids}"
        puts "user_responsible_ids #{user_responsible_ids}"
        puts end_date
        start_date != "" ? (scope :fecha_comienzo, -> { where(["start_date >= ?", start_date]) }) : (scope :fecha_comienzo, -> { where.not(id: nil) })
        end_date != "" ? (scope :fecha_final, -> { where(["end_date <= ?", end_date]) }) : (scope :fecha_final, -> { where.not(id: nil) })
        cost_center_ids != [] ? (scope :centro_de_costo, -> { where(cost_center_id: cost_center_ids) }) : (scope :centro_de_costo, -> { where.not(id: nil) })
        user_responsible_ids != [] ? (scope :usuario_responsable, -> { where(user_responsible_id: user_responsible_ids) }) : (scope :usuario_responsable, -> { where.not(id: nil) })

        fecha_comienzo.fecha_final.centro_de_costo.usuario_responsable
    end
end

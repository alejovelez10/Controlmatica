# == Schema Information
#
# Table name: expense_ratios
#
#  id                  :bigint           not null, primary key
#  creation_date       :date
#  user_report_id      :integer
#  start_date          :date
#  end_date            :date
#  area                :string
#  observations        :text
#  user_direction_id   :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  last_user_edited_id :integer
#  user_id             :integer
#

class ExpenseRatio < ApplicationRecord
    belongs_to :user_report, class_name: "User"
    belongs_to :user_direction, class_name: "User"
    belongs_to :last_user_edited, :class_name => "User", optional: :true
    belongs_to :user, optional: :true
    before_update :edit_values

    def edit_values
      self.last_user_edited_id = User.current.id
    end

    def self.search(search1, search2, search3, search4, search5, search6, search7)
        search1 != "" ? (scope :user_direction, -> { where(user_direction_id: search1) }) : (scope :user_direction, -> { where.not(id: nil) })
        search2 != "" ? (scope :user_report, -> { where(user_report_id: search2) }) : (scope :user_report, -> { where.not(id: nil) })
        search3 != "" ? (scope :descripcion, -> { where("observations like '%#{search3.downcase}%' or observations like '%#{search3.upcase}%' or observations like '%#{search3.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })
        search4 != "" ? (scope :f_comienzo, -> { where(start_date: search4) }) : (scope :f_comienzo, -> { where.not(id: nil) })
        search5 != "" ? (scope :f_final, -> { where(end_date: search5) }) : (scope :f_final, -> { where.not(id: nil) })
        search6 != "" ? (scope :f_creation, -> { where(creation_date: search6) }) : (scope :f_creation, -> { where.not(id: nil) })
        search7 != "" ? (scope :are, -> { where("area like '%#{search7.downcase}%' or area like '%#{search7.upcase}%' or area like '%#{search7.capitalize}%' ") }) : (scope :are, -> { where.not(id: nil) })
        user_direction.user_report.descripcion.f_comienzo.f_final.f_creation.are
    end
    
end

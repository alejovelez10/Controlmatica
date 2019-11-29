# == Schema Information
#
# Table name: contractors
#
#  id              :bigint           not null, primary key
#  sales_number    :string
#  sales_date      :date
#  ammount         :float
#  cost_center_id  :integer
#  user_id         :integer
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  description     :text
#  hours           :integer
#  user_execute_id :integer
#

class Contractor < ApplicationRecord
    belongs_to :cost_center
    belongs_to :user_execute, :class_name => "User"

    def self.search(search1, search2)
        search1 != "" ? (scope :execute_user, -> { where(user_execute_id: search1) }) : (scope :execute_user, -> { where.not(id: nil) })
        search2 != " " && search2 != nil && search2 != "" ? (scope :date, -> { where("DATE(sales_date) = ?", search2) }) : (scope :date, -> { where.not(id: nil) })
        execute_user.date
    end
end

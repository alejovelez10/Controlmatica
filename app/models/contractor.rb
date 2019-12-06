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
#  hours           :float
#  user_execute_id :integer
#

class Contractor < ApplicationRecord
  belongs_to :cost_center
  belongs_to :user_execute, :class_name => "User"

  before_save :calculate_cost_total
  after_save :calculate_cost
  after_destroy :calculate_cost_destroy

  def self.search(search1, search2, search3)
    search1 != "" ? (scope :execute_user, -> { where(user_execute_id: search1) }) : (scope :execute_user, -> { where.not(id: nil) })
    search2 != " " && search2 != nil && search2 != "" ? (scope :date, -> { where("DATE(sales_date) = ?", search2) }) : (scope :date, -> { where.not(id: nil) })
    search3 != "" ? (scope :centro, -> { where(cost_center_id: search3) }) : (scope :centro, -> { where.not(id: nil) })
    execute_user.date.centro
  end

  def calculate_cost
    cost_center = CostCenter.find(self.cost_center_id)
    sum_contractor_costo = cost_center.contractors.sum(:ammount)
    cost_center.update(sum_contractor_costo: sum_contractor_costo)
  end

  def calculate_cost_total
    cost_center = CostCenter.find(self.cost_center_id)
    self.ammount = cost_center.hours_contractor_real * self.hours
  end

  def calculate_cost_destroy
    cost_center = CostCenter.find(self.cost_center_id_was)
    sum_contractor_costo = cost_center.contractors.sum(:ammount)
    cost_center.update(sum_contractor_costo: sum_contractor_costo)
  end
end

# == Schema Information
#
# Table name: commissions
#
#  id                  :bigint           not null, primary key
#  end_date            :date
#  hours_worked        :float
#  is_acepted          :boolean          default(FALSE)
#  observation         :text
#  start_date          :date
#  total_value         :float
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  cost_center_id      :integer
#  customer_invoice_id :integer
#  customer_report_id  :integer
#  last_user_edited_id :integer
#  user_id             :integer
#  user_invoice_id     :integer
#
class Commission < ApplicationRecord
  belongs_to :user_invoice, class_name: "User"
  belongs_to :last_user_edited, class_name: "User", optional: true
  belongs_to :user
  belongs_to :customer_invoice

  belongs_to :customer_report
  belongs_to :cost_center

  after_create :save_total

  def self.search(search1, search2, search3, search4, search5, search6, search7, search8)
    search1 != "" ? (scope :user, -> { where(user_invoice_id: search1) }) : (scope :user, -> { where.not(id: nil) })

    search2 != "" ? (scope :fdesdep, -> { where("DATE(start_date) = ?", search2) }) : (scope :fdesdep, -> { where.not(id: nil) })
    search3 != "" ? (scope :fhastap, -> { where("DATE(end_date) = ?", search3) }) : (scope :fhastap, -> { where.not(id: nil) })

    search4 != "" ? (scope :customer_invoice_find, -> { where(customer_invoice_id: search4) }) : (scope :customer_invoice_find, -> { where.not(id: nil) })
    search5 != "" ? (scope :descripcion, -> { where("observation like '%#{search5.downcase}%' or observation like '%#{search5.upcase}%' or observation like '%#{search5.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })
    search6 != "" ? (scope :hours, -> { where(hours_worked: search6) }) : (scope :hours, -> { where.not(id: nil) })
    search7 != "" ? (scope :total, -> { where(total_value: search7) }) : (scope :total, -> { where.not(id: nil) })
    search8 != "" ? (scope :estado, -> { where(is_acepted: search8) }) : (scope :estado, -> { where.not(id: nil) })

    user.fdesdep.fhastap.customer_invoice_find.descripcion.hours.total.estado
  end

  def save_total
    cost_center = CostCenter.find(self.cost_center_id)
    value_engineer_hour = cost_center.engineering_value * self.hours_worked * 0.05
    self.total_value = value_engineer_hour
  end
end

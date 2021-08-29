# == Schema Information
#
# Table name: contractors
#
#  id                  :bigint           not null, primary key
#  sales_number        :string
#  sales_date          :date
#  ammount             :float
#  cost_center_id      :integer
#  user_id             :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  description         :text
#  hours               :float
#  user_execute_id     :integer
#  update_user         :integer
#  last_user_edited_id :integer
#

class Contractor < ApplicationRecord
  belongs_to :cost_center
  belongs_to :user_execute, :class_name => "User"
  belongs_to :last_user_edited, :class_name => "User", optional: :true
  belongs_to :user, optional: :true

  before_save :calculate_cost_total
  after_save :calculate_cost
  after_destroy :calculate_cost_destroy
  before_update :create_edit_register

  def self.search(search1, search2, search3, search4, search5, search6)
    search1 != "" ? (scope :execute_user, -> { where(user_execute_id: search1) }) : (scope :execute_user, -> { where.not(id: nil) })
    search2 != " " && search2 != nil && search2 != "" ? (scope :date, -> { where("DATE(sales_date) = ?", search2) }) : (scope :date, -> { where.not(id: nil) })
    search3 != "" ? (scope :centro, -> { where(cost_center_id: search3) }) : (scope :centro, -> { where.not(id: nil) })
    search4 != "" ? (scope :fdesdep, -> { where(["sales_date > ?", search4]) }) : (scope :fdesdep, -> { where.not(id: nil) })
    search5 != "" ? (scope :fhastap, -> { where(["sales_date < ?", search5]) }) : (scope :fhastap, -> { where.not(id: nil) })
    search6 != "" ? (scope :descripcion, -> { where("description like '%#{search6.downcase}%' or description like '%#{search6.upcase}%' or description like '%#{search6.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })
    execute_user.date.centro.fdesdep.fhastap.descripcion

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

  def create_edit_register
    self.last_user_edited_id = User.current.id
    if self.cost_center_id_changed?
      names = []
      cost_center = CostCenter.where(id: self.cost_center_id_change)
      cost_center.each do |centro| 
        names << centro.code
      end
      centro = "<p>El Centro de costo: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      centro = ""
    end

    if self.user_execute_id_changed?
      names = []
      users = User.where(id: self.user_execute_id_change)
      users.each do |user| 
        names << user.names
      end
      user = "<p>Las Horas trabajadas por: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      user = ""
    end
    
    sales_date = self.sales_date_changed? == true ? ("<p>La Fecha de generación: <b class='color-true'>#{self.sales_date_change[0]}</b> / <b class='color-false'>#{self.sales_date_change[1]}</b></p>") : "" 
    hours = self.hours_changed? == true ? ("<p>Las Horas trabajadas: <b class='color-true'>#{self.hours_change[0]}</b> / <b class='color-false'>#{self.hours_change[1]}</b></p>") : "" 
    description = self.description_changed? == true ? ("<p>La descripcion: <b class='color-true'>#{self.description_change[0]}</b> / <b class='color-false'>#{self.description_change[1]}</b></p>") : "" 
    
    str = "#{centro}#{user}#{sales_date}#{hours}#{description}"

    if str.length > 5
      str = "<p>Centro de costos: #{self.cost_center.code}</p> " + str
    RegisterEdit.create(  
      user_id: self.update_user, 
      register_user_id: self.id, 
      state: "pending", 
      date_update: Time.now,
      module: "Tableristas",
      description: str
    )
  end
  end
  
end

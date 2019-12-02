# == Schema Information
#
# Table name: materials
#
#  id                      :bigint           not null, primary key
#  provider_id             :integer
#  sales_date              :date
#  sales_number            :string
#  amount                  :float
#  delivery_date           :date
#  sales_state             :string
#  description             :text
#  provider_invoice_number :string
#  provider_invoice_value  :float
#  cost_center_id          :integer
#  user_id                 :integer
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#

class Material < ApplicationRecord
  belongs_to :cost_center
  belongs_to :provider
  after_save :calculate_cost

  after_destroy :calculate_cost_destroy

  def self.search(search1, search2, search3)
    search1 != "" ? (scope :proveedor, -> { where(provider_id: search1) }) : (scope :proveedor, -> { where.not(id: nil) })
    search2 != " " && search2 != nil && search2 != "" ? (scope :date, -> { where("DATE(sales_date) = ?", search2) }) : (scope :date, -> { where.not(id: nil) })
    search3 != "" ? (scope :descripcion, -> { where("description like '%#{search3.downcase}%' or description like '%#{search3.upcase}%' or description like '%#{search3.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })
    proveedor.date.descripcion
  end

  def calculate_cost
    cost_center = CostCenter.find(self.cost_center_id)
    sum_materials_costo = cost_center.materials.sum(:amount)
    cost_center.update(sum_materials_value: sum_materials_costo)
  end

  def calculate_cost_destroy
    cost_center = CostCenter.find(self.cost_center_id_was)
    sum_materials_costo = cost_center.materials.sum(:amount)
    cost_center.update(sum_materials_value: sum_materials_costo)
  end
end

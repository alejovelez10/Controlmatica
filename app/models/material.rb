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
  has_many :material_invoices, dependent: :destroy

  after_destroy :calculate_cost_destroy
  #before_create :set_state

  def self.search(search1, search2, search3, search4, search5, search6, search7, search8)
    search1 != "" ? (scope :proveedor, -> { where(provider_id: search1) }) : (scope :proveedor, -> { where.not(id: nil) })
    search2 != " " && search2 != nil && search2 != "" ? (scope :date, -> { where("DATE(sales_date) = ?", search2) }) : (scope :date, -> { where.not(id: nil) })
    search3 != "" ? (scope :descripcion, -> { where("description like '%#{search3.downcase}%' or description like '%#{search3.upcase}%' or description like '%#{search3.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })
    search4 != "" ? (scope :centro, -> { where(cost_center_id: search4) }) : (scope :centro, -> { where.not(id: nil) })
    search5 != "" ? (scope :estado, -> { where("sales_state like '%#{search5.downcase}%' or sales_state like '%#{search5.upcase}%' or sales_state like '%#{search5.capitalize}%' ") }) : (scope :estado, -> { where.not(id: nil) })
    search6 != "" ? (scope :fdesdep, -> { where(["sales_date > ?", search6]) }) : (scope :fdesdep, -> { where.not(id: nil) })
    search7 != "" ? (scope :fhastap, -> { where(["sales_date < ?", search7]) }) : (scope :fhastap, -> { where.not(id: nil) })
    search8 != "" ? (scope :order_number, -> { where(sales_number: search8) }) : (scope :order_number, -> { where.not(id: nil) })
    proveedor.date.descripcion.centro.estado.fdesdep.fhastap.order_number
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


  def self.set_state(id)
    material = Material.find(id)

    invoice_total = material.material_invoices.sum(:value)
    material.provider_invoice_value = invoice_total

    if invoice_total > material.amount
      puts "111111111111111343434434"
      material.update(sales_state: "INGRESADO CON MAYOR VALOR EN FACTURA")
    elsif (invoice_total < material.amount) && invoice_total > 0
      puts "33333333334334"
      material.update(sales_state: "INGRESADO PARCIAL")
    elsif invoice_total == 0
      puts "22222234343434"
      material.update(sales_state: "PROCESADO")
    elsif invoice_total == material.amount
      puts "222222343434"
      material.update(sales_state: "INGRESADO TOTAL")
    end
  end

=begin

  def set_state
    invoice_total = self.material_invoices.sum(:value)
    self.provider_invoice_value = invoice_total

    if invoice_total > self.amount
      puts "111111111111111343434434"
      self.sales_state = "INGRESADO CON MAYOR VALOR EN FACTURA"
    elsif (invoice_total < self.amount) && invoice_total > 0
      puts "33333333334334"
      self.sales_state = "INGRESADO PARCIAL"
    elsif invoice_total == 0
      puts "22222234343434"
      self.sales_state = "PROCESADO"
    elsif invoice_total == self.amount
      puts "222222343434"
      self.sales_state = "INGRESADO TOTAL"
    end
  end
  
=end

  #
  
end
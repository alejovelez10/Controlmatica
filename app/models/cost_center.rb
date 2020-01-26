# == Schema Information
#
# Table name: cost_centers
#
#  id                        :bigint           not null, primary key
#  customer_id               :integer
#  contact_id                :integer
#  description               :text
#  start_date                :date
#  end_date                  :date
#  quotation_number          :string
#  engineering_value         :float
#  viatic_value              :float
#  execution_state           :string
#  invoiced_state            :string
#  service_type              :string
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  count                     :integer
#  code                      :string
#  create_type               :boolean
#  eng_hours                 :float
#  hour_cotizada             :float
#  hour_real                 :float
#  quotation_value           :float
#  work_force_contractor     :float
#  hours_contractor          :float
#  hours_contractor_invoices :float
#  hours_contractor_real     :float
#  materials_value           :float
#  user_id                   :integer
#  sum_materials             :string
#  sum_contractors           :string
#  sum_executed              :string
#  sum_viatic                :float
#  ingenieria_total_costo    :float            default(0.0)
#  sum_materials_costo       :float            default(0.0)
#  sum_materials_cot         :float            default(0.0)
#  contractor_total_costo    :float            default(0.0)
#  sum_contractor_costo      :float            default(0.0)
#  sum_contractor_cot        :float            default(0.0)
#  sum_materials_value       :float            default(0.0)
#  displacement_hours        :float
#  value_displacement_hours  :float
#  offset_value              :float
#

class CostCenter < ApplicationRecord
  has_many :reports, dependent: :destroy
  has_many :customer_reports, dependent: :destroy
  has_many :sales_orders, dependent: :destroy
  has_many :customer_invoices, dependent: :destroy
  has_many :materials, dependent: :destroy
  has_many :contractors, dependent: :destroy

  belongs_to :customer, optional: :true
  belongs_to :contact, optional: :true
  belongs_to :user, optional: :true

  before_create :create_code
  before_update :change_state

  before_save :calculate_costo

  scope :filter, -> { where("service_type like 'PROYECTO' or service_type like 'SERVICIO'") }
  scope :tableristas, -> { where(service_type: "PROYECTO") }

  def self.search(search1, search2, search3, search4, search5, search6, search7,search8,search9)
      search1 != "" ? (scope :descripcion, -> { where("description like '%#{search1.downcase}%' or description like '%#{search1.upcase}%' or description like '%#{search1.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })
      search2 != "" ? (scope :customer, -> { where(customer_id: search2) }) : (scope :customer, -> { where.not(id: nil) })
      search3 != "" ? (scope :state_execution, -> { where(execution_state: search3) }) : (scope :state_execution, -> { where.not(id: nil) })
      search4 != "" ? (scope :state_invoice, -> { where(invoiced_state: search4) }) : (scope :state_invoice, -> { where.not(id: nil) })
      search5 != "" ? (scope :cost_center, -> { where(id: search5) }) : (scope :cost_center, -> { where.not(id: nil) })
      search6 != "" ? (scope :service_type_scope, -> { where(service_type: search6) }) : (scope :service_type_scope, -> { where.not(id: nil) })
      search7 != "" ? (scope :date_desde_type_scope, -> { where(["start_date >= ?", search7]) }) : (scope :date_desde_type_scope, -> { where.not(id: nil) })
      search8 != "" ? (scope :date_hasta_type_scope, -> { where(["start_date <= ?", search8]) }) : (scope :date_hasta_type_scope, -> { where.not(id: nil) })
      search9 != "" ? (scope :quotation_number_scope, -> { where(quotation_number: search9) }) : (scope :quotation_number_scope, -> { where.not(id: nil) })

      descripcion.customer.state_execution.state_invoice.cost_center.service_type_scope.date_desde_type_scope.date_hasta_type_scope.quotation_number_scope
    end

  def create_code
    self.sum_executed = 0
    self.sum_contractors = 0
    self.sum_materials = 0
    self.sum_viatic = 0
    if self.start_date.present?
      año = self.start_date
    else
      año = Time.now
    end

    self.ingenieria_total_costo = self.eng_hours * self.hour_real
    self.engineering_value = self.eng_hours * self.hour_cotizada
    self.contractor_total_costo = self.hours_contractor * self.hours_contractor_real
    self.work_force_contractor = self.hours_contractor * self.hours_contractor_invoices

    count = CostCenter.where(service_type: self.service_type).where(customer_id: self.customer_id).maximum(:count)
    customer_prefix = Customer.find(self.customer_id).code
    self.count = count == 0 || count.blank? || count.nil? ? 1 : count + 1
    prefix = self.service_type.slice(0, 3).upcase
    self.code = prefix + "-" + customer_prefix + "-" + self.count.to_s + "-" + año.year.to_s
    self.hour_real = Parameterization.where(name: "HORA HOMBRE COSTO").first.money_value
    self.hour_cotizada = Parameterization.where(name: "HORA HOMBRE COTIZADA").first.money_value
    self.invoiced_state = self.quotation_number.blank? || self.quotation_number.nil? || self.quotation_number == "" || self.quotation_number == "N/A" ? "PENDIENTE DE COTIZACION" : "PENDIENTE DE ORDEN DE COMPRA"
  end

  def calculate_costo
    self.ingenieria_total_costo = self.eng_hours * self.hour_real
    self.engineering_value = self.eng_hours * self.hour_cotizada
    self.contractor_total_costo = self.hours_contractor * self.hours_contractor_real
    self.work_force_contractor = self.hours_contractor * self.hours_contractor_invoices

    if self.displacement_hours.present? || self.value_displacement_hours.present?
      valor = self.displacement_hours * self.hour_real
      self.offset_value = valor
    end
  end

  def change_state
    puts("wewewe")
    self.engineering_value = self.hour_cotizada * self.eng_hours
    puts !self.quotation_number.blank?
    puts !self.quotation_number.nil?

    puts self.invoiced_state == "PENDIENTE DE COTIZACION"

    if self.invoiced_state == "PENDIENTE DE COTIZACION" && !self.quotation_number.blank? && !self.quotation_number.nil?  && (self.quotation_number != "N/A")
      puts("hoasfhasddaslkdjdkljskfa")
      self.invoiced_state = "PENDIENTE DE ORDEN DE COMPRA"
    end
  end
end

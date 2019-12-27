# == Schema Information
#
# Table name: reports
#
#  id                       :bigint           not null, primary key
#  report_date              :date
#  user_id                  :integer
#  working_time             :float
#  working_value            :float
#  work_description         :text
#  viatic_value             :float
#  viatic_description       :text
#  total_value              :float
#  cost_center_id           :integer
#  report_execute_id        :integer
#  report_code              :integer
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  code_report              :string
#  customer_name            :string
#  contact_name             :string
#  contact_email            :string
#  contact_phone            :string
#  contact_position         :string
#  customer_id              :integer
#  contact_id               :integer
#  report_sate              :boolean
#  count                    :integer
#  displacement_hours       :float
#  value_displacement_hours :float
#

class Report < ApplicationRecord
  has_and_belongs_to_many :customer_reports
  belongs_to :cost_center, optional: true
  belongs_to :customer
  before_save :create_total
  belongs_to :report, optional: true
  belongs_to :report_execute, :class_name => "User"
  before_create :create_code
  belongs_to :contact, optional: true
  before_create :coste_center_verify
  after_create :save_report_in_cost_center
  after_destroy :calculate_cost_destroy
  after_save :calculatate_update



  def self.search(search1, search2, search3, search4, search5)
    search1 != "" ? (scope :descripcion, -> { where("work_description like '%#{search1.downcase}%' or work_description like '%#{search1.upcase}%' or work_description like '%#{search1.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })
    search2 != "" ? (scope :responsible, -> { where(report_execute_id: search2) }) : (scope :responsible, -> { where.not(id: nil) })
    search3 != " " && search3 != nil && search3 != "" ? (scope :date_ejecution, -> { where("DATE(report_date) = ?", search3) }) : (scope :date_ejecution, -> { where.not(id: nil) })
    search4 != "" ? (scope :state_report, -> { where(report_sate: search4) }) : (scope :state_report, -> { where.not(id: nil) })
    search5 != "" ? (scope :centro, -> { where(cost_center_id: search5) }) : (scope :centro, -> { where.not(id: nil) })
    descripcion.responsible.date_ejecution.state_report.centro
  end

  def create_code
    puts self.cost_center.nil?

    if self.cost_center_id != nil && self.cost_center_id != "Centro de costos" && self.cost_center_id != 0
      puts "hhahahahjahahahahahahahahah"
      puts self.cost_center
      
      count = Report.where(customer_id: self.customer_id).maximum(:count)
      self.count = count == 0 || count.blank? || count.nil? ? 1 : count + 1
      customer_prefix = Customer.find(self.cost_center.customer.id).code
      self.code_report = "REP-" + customer_prefix + "-" + self.count.to_s + "-" + Time.now.year.to_s
    end
  end

  def create_total
    if self.cost_center_id != nil && self.cost_center_id != 0
      cost_center = CostCenter.find(self.cost_center_id)
      self.working_value = self.working_time * cost_center.hour_real
      self.value_displacement_hours = self.value_displacement_hours * cost_center.value_displacement_hours
      self.total_value = self.viatic_value + (self.working_time * cost_center.hour_real)
      
    else
      self.working_value = 0
      self.total_value = 0
    end
  end

  def coste_center_verify
    puts "3333333333333333"

    puts self.customer_id
    if self.cost_center_id == nil || self.cost_center_id == 0  
      costcenter = CostCenter.create(contact_id:  self.contact_id, customer_id: self.customer_id, service_type: "SERVICIO", create_type: false, viatic_value: 0, engineering_value: 0, eng_hours: 0, hour_real: 0.0, hour_cotizada:0.0, quotation_value: 0, execution_state: "EJECUCION",work_force_contractor: 0.0, hours_contractor:0.0,hours_contractor_invoices:0.0,hours_contractor_real:0.0,materials_value:0.0,sum_materials:0.0,sum_contractors:0.0,sum_executed:0.0, sum_viatic:self.viatic_value, sum_materials_costo:0.0,sum_materials_cot:0.0, contractor_total_costo:0.0, sum_contractor_costo:0.0,sum_contractor_cot:0.0,sum_materials_value:0.0,ingenieria_total_costo:0.0)
      self.cost_center_id = costcenter.id
      
      count = Report.where(customer_id: self.customer_id).maximum(:count)
      self.count = count == 0 || count.blank? || count.nil? ? 1 : count + 1
      customer_prefix = Customer.find(costcenter.customer.id).code
      self.code_report = "REP-" + customer_prefix + "-" + self.count.to_s + "-" + Time.now.year.to_s
    
    else
      CostCenter.find(self.cost_center_id).update(execution_state: "EJECUCION")
    end

    #if self.contact_id == nil
    #Contact.create(customer_id: self.customer_id, name: self.contact_name, email: self.contact_email, phone: self.contact_phone, position: self.contact_position, user_id: self.user_id)
    #else
    #contact = Contact.find(self.contact_id)
    #self.contact_name = contact.name
    #self.contact_position = contact.position
    #self.contact_email = contact.email
    #self.contact_phone = contact.phone
    #CostCenter.last.update(contact_id: contact.id)
    #end
  end

  def save_report_in_cost_center

    
  end

  def calculatate_update
    unless self.cost_center_id == nil || self.cost_center_id == 0
    
    cost_center = CostCenter.find(self.cost_center_id)
    working_value = cost_center.reports.sum(:working_value)
    viatic_value = cost_center.reports.sum(:viatic_value)
    cost_center.update(sum_materials_costo: working_value, sum_viatic: viatic_value)
    puts "ñaslkfjsakfjadsñlfjasñljfkoñsadjflkasdjflkasfjlksajflkasjfklsajfklsajfklasdjfklasjfklasjfasñfjals"
    end
  
  end

  def calculate_cost_destroy
    cost_center = CostCenter.find(self.cost_center_id_was)
    working_value = cost_center.reports.sum(:working_value)
    viatic_value = cost_center.reports.sum(:viatic_value)
    cost_center.update(sum_materials_costo: working_value, sum_viatic: viatic_value)
  end
end

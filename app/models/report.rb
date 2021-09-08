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
#  report_code              :string
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
#  update_user              :integer
#  last_user_edited_id      :integer
#

class Report < ApplicationRecord
  has_and_belongs_to_many :customer_reports
  belongs_to :cost_center, optional: true
  belongs_to :customer
  before_save :create_total
  belongs_to :report, optional: true
  belongs_to :report_execute, :class_name => "User"
  belongs_to :last_user_edited, :class_name => "User", optional: :true
  before_create :create_code
  belongs_to :contact, optional: true
  belongs_to :user, optional: :true
  before_create :coste_center_verify
  after_destroy :calculate_cost_destroy
  after_save :calculatate_update
  before_update :create_edit_register



  def self.search(search1, search2, search3, search4, search5, search6, search7, search8)
    search1 != "" ? (scope :descripcion, -> { where("work_description like '%#{search1.downcase}%' or work_description like '%#{search1.upcase}%' or work_description like '%#{search1.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })
    search2 != "" ? (scope :responsible, -> { where(report_execute_id: search2) }) : (scope :responsible, -> { where.not(id: nil) })
    search3 != " " && search3 != nil && search3 != "" ? (scope :date_ejecution, -> { where("DATE(report_date) = ?", search3) }) : (scope :date_ejecution, -> { where.not(id: nil) })
    search4 != "" ? (scope :state_report, -> { where(report_sate: search4) }) : (scope :state_report, -> { where.not(id: nil) })
    search5 != "" ? (scope :centro, -> { where(cost_center_id: search5) }) : (scope :centro, -> { where.not(id: nil) })
    search6 != "" ? (scope :customer, -> { where(customer_id: search6) }) : (scope :customer, -> { where.not(id: nil) })
    search7 != "" ? (scope :fdesdep, -> { where(["report_date > ?", search7]) }) : (scope :fdesdep, -> { where.not(id: nil) })
    search8 != "" ? (scope :fhastap, -> { where(["report_date < ?", search8]) }) : (scope :fhastap, -> { where.not(id: nil) })
    descripcion.responsible.date_ejecution.state_report.centro.customer.fdesdep.fhastap
  end

  def create_code
    puts self.cost_center.nil?

    if self.cost_center_id != nil && self.cost_center_id != "Centro de costos" && self.cost_center_id != 0
      puts "hhahahahjahahahahahahahahah"
      puts self.cost_center
      
      count = Report.where(customer_id: self.customer_id).maximum(:count)
      self.count = count == 0 || count.blank? || count.nil? ? 1 : count + 1
      customer_prefix = Customer.find(self.cost_center.customer.id).code
      self.code_report = "REP-" + customer_prefix + "-" + self.count.to_s + "-" + self.report_date.year.to_s
    end
  end

  def create_total
    if self.cost_center_id != nil && self.cost_center_id != 0
      cost_center = CostCenter.find(self.cost_center_id)
      self.working_value = self.working_time * cost_center.hour_real
      self.value_displacement_hours = self.displacement_hours * cost_center.hour_real
      self.total_value = (self.viatic_value.present? ? self.viatic_value : 0) + (self.working_time * cost_center.hour_real)
      
    else
      self.working_value = 0
      self.total_value = 0
    end
  end

  def coste_center_verify
    puts "3333333333333333"

    puts self.customer_id
    if self.cost_center_id == nil || self.cost_center_id == 0  
      costcenter = CostCenter.create(contact_id:  self.contact_id, customer_id: self.customer_id, service_type: "SERVICIO", create_type: false, viatic_value: 0, engineering_value: 0, eng_hours: 0, hour_real: 0.0, hour_cotizada:0.0, quotation_value: 0, execution_state: "EJECUCION",work_force_contractor: 0.0, hours_contractor:0.0,hours_contractor_invoices:0.0,hours_contractor_real:0.0,materials_value:0.0,sum_materials:0.0,sum_contractors:0.0,sum_executed:0.0, sum_viatic:self.viatic_value, sum_materials_costo:0.0,sum_materials_cot:0.0, contractor_total_costo:0.0, sum_contractor_costo:0.0,sum_contractor_cot:0.0,sum_materials_value:0.0,ingenieria_total_costo:0.0, description: "SIN INFORMACIÓN")
      self.cost_center_id = costcenter.id
      
      count = Report.where(customer_id: self.customer_id).maximum(:count)
      self.count = count == 0 || count.blank? || count.nil? ? 1 : count + 1
      customer_prefix = Customer.find(costcenter.customer.id).code
      self.code_report = "REP-" + customer_prefix + "-" + self.count.to_s + "-" + self.report_date.year.to_s
    else
      CostCenter.find(self.cost_center_id).update(execution_state: "EJECUCION")
    end
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

  def create_edit_register
    self.last_user_edited_id = User.current.id
    if self.customer_id_changed?
      names = []
      customers = Customer.where(id: self.customer_id_change)
      customers.each do |customer| 
        names << customer.name
      end
      customer = "<p>El Cliente: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      customer = ""
    end

    if self.contact_id_changed?
      names = []
      contacts = Contact.where(id: self.contact_id_change)
      contacts.each do |contact| 
        names << contact.name
      end
      contact = "<p>El Contacto: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      contact = ""
    end

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

    if self.report_execute_id_changed?
      names = []
      users = User.where(id: self.report_execute_id_change)
      users.each do |user| 
        names << user.names
      end
      user = "<p>El Responsable de Ejecucion: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      user = ""
    end


    
    date = self.report_date_changed? == true ? ("<p>La Fecha del reporte: <b class='color-true'>#{self.report_date_change[0]}</b> / <b class='color-false'>#{self.report_date_change[1]}</b></p>") : "" 
    working_time = self.working_time_changed? == true ? ("<p>EL Tiempo de Trabajo: <b class='color-true'>#{self.working_time_change[0]}</b> / <b class='color-false'>#{self.working_time_change[1]}</b></p>") : "" 
    work_description = self.work_description_changed? == true ? ("<p>La Descripcion del trabajo: <b class='color-true'>#{self.work_description_change[0]}</b> / <b class='color-false'>#{self.work_description_change[1]}</b></p>") : "" 
    displacement_hours = self.displacement_hours_changed? == true ? ("<p>La Horas de desplazamiento: <b class='color-true'>#{self.displacement_hours_change[0]}</b> / <b class='color-false'>#{self.displacement_hours_change[1]}</b></p>") : "" 
    viatic_value = self.viatic_value_changed? == true ? ("<p>La Valor de viaticos: <b class='color-true'>#{self.viatic_value_change[0]}</b> / <b class='color-false'>#{self.viatic_value_change[1]}</b></p>") : "" 
    viatic_description = self.viatic_description_changed? == true ? ("<p>La Descripcion viaticos: <b class='color-true'>#{self.viatic_description_change[0]}</b> / <b class='color-false'>#{self.viatic_description_change[1]}</b></p>") : "" 
    
    str = "#{customer}#{contact}#{centro}#{date}#{user}#{working_time}#{work_description}#{displacement_hours}#{viatic_value}#{viatic_description}"

    if str.length > 5
      str = "<p>Reporte: #{self.code_report}</p> <p>Centro de costos: #{self.cost_center.code}</p>" + str
    RegisterEdit.create(  
      user_id:  User.current.id, 
      register_user_id: self.id, 
      state: "pending", 
      date_update: Time.now,
      module: "Reportes de servicios",
      description: str
    )
  end
end


  def calculate_cost_destroy
    cost_center = CostCenter.find(self.cost_center_id_was)
    working_value = cost_center.reports.sum(:working_value)
    viatic_value = cost_center.reports.sum(:viatic_value)
    cost_center.update(sum_materials_costo: working_value, sum_viatic: viatic_value)
  end
end

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
#  update_user               :integer
#  ing_horas_eje             :float            default(0.0)
#  ing_horas_porcentaje      :float            default(0.0)
#  ing_costo_cotizado        :float            default(0.0)
#  ing_costo_real            :float            default(0.0)
#  ing_costo_porcentaje      :float            default(0.0)
#  cont_horas_eje            :float            default(0.0)
#  cont_horas_porcentaje     :float            default(0.0)
#  cont_costo_cotizado       :float            default(0.0)
#  cont_costo_real           :float            default(0.0)
#  cont_costo_porcentaje     :float            default(0.0)
#  mat_costo_real            :float            default(0.0)
#  mat_costo_porcentaje      :float            default(0.0)
#  viat_costo_real           :float            default(0.0)
#  viat_costo_porcentaje     :float            default(0.0)
#  fact_real                 :float            default(0.0)
#  fact_porcentaje           :float            default(0.0)
#  desp_horas_eje            :float            default(0.0)
#  desp_horas_porcentaje     :float            default(0.0)
#  aiu                       :float            default(0.0)
#  aiu_percent               :float            default(0.0)
#  aiu_real                  :float            default(0.0)
#  aiu_percent_real          :float            default(0.0)
#  total_expenses            :float            default(0.0)
#  last_user_edited_id       :integer
#  user_owner_id             :integer
#  sales_state               :string           default("SIN COMPRAS")
#

class CostCenter < ApplicationRecord
  has_many :reports, dependent: :destroy
  has_many :customer_reports, dependent: :destroy
  has_many :sales_orders, dependent: :destroy
  has_many :customer_invoices, dependent: :destroy
  has_many :materials, dependent: :destroy
  has_many :contractors, dependent: :destroy
  has_many :shifts, dependent: :destroy
  has_many :notification_alerts, dependent: :destroy
  has_many :report_expenses
  has_many :commissions

  belongs_to :customer, optional: :true
  belongs_to :contact, optional: :true
  belongs_to :user, optional: :true
  belongs_to :last_user_edited, :class_name => "User", optional: :true
  belongs_to :user_owner, :class_name => "User", optional: :true

  before_create :create_code
  before_update :change_state
  before_update :change_state_cost_center

  before_save :calculate_costo

  scope :filterCost, -> { where("service_type like 'PROYECTO' or service_type like 'SERVICIO'").where.not(execution_state: "FINALIZADO") }
  scope :tableristas, -> { where(service_type: "PROYECTO") }
  #filtros para todo
  def self.search(search1, search2, search3, search4, search5, search6, search7, search8, search9)
    search1 != "" ? (scope :descripcion, -> { where("description like '%#{search1.downcase}%' or description like '%#{search1.upcase}%' or description like '%#{search1.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })
    search2 != "" ? (scope :customer, -> { where(customer_id: search2) }) : (scope :customer, -> { where.not(id: nil) })
    search3 != "" ? (scope :state_execution, -> { where(execution_state: search3) }) : (scope :state_execution, -> { where.not(id: nil) })
    search4 != "" ? (scope :state_invoice, -> { where(invoiced_state: search4) }) : (scope :state_invoice, -> { where.not(id: nil) })
    search5 != "" ? (scope :cost_center, -> { where(id: search5) }) : (scope :cost_center, -> { where.not(id: nil) })
    search6 != "" ? (scope :service_type_scope, -> { where(service_type: search6) }) : (scope :service_type_scope, -> { where.not(id: nil) })
    search7 != "" ? (scope :date_desde_type_scope, -> { where(["start_date >= ?", search7]) }) : (scope :date_desde_type_scope, -> { where.not(id: nil) })
    search8 != "" ? (scope :date_hasta_type_scope, -> { where(["start_date <= ?", search8]) }) : (scope :date_hasta_type_scope, -> { where.not(id: nil) })
    search9 != "" ? (scope :quotation_number_scope, -> { where("quotation_number like '%#{search9.downcase}%' or quotation_number like '%#{search9.upcase}%' or quotation_number like '%#{search9.capitalize}%' ") }) : (scope :quotation_number_scope, -> { where.not(id: nil) })

    return descripcion.customer.state_execution.state_invoice.cost_center.service_type_scope.date_desde_type_scope.date_hasta_type_scope.quotation_number_scope
  end

  def self.searchInfo(search1, search2, search3, search4, search5, search6, search7, search8, search9)
    puts "model"
    puts search5
    puts search1
    search4 = search4 != "" ? search4.split(/,/) : ""
    search1 = search1 != "" ? search1.split(/,/) : ""
    search2 = search2 != "" ? search2.split(/,/) : ""
    search3 = search3 != "" ? search3.split(/,/) : ""
    search5 = search5 != "" ? search5.split(/,/) : ""

    puts search4
    puts search1
    puts search2
    puts search3
    puts search5
    puts "---------"
    puts search8

    if search8 == "Incluidos"
      puts "incluidosssssssssssssssss customer"
      search1 != "" ? (scope :customer, -> { where(customer_id: search1) }) : (scope :customer, -> { where.not(id: nil) })
    else
      puts "exosssssssssssssssss customer"

      search1 != "" ? (scope :customer, -> { where.not(customer_id: search1) }) : (scope :customer, -> { where.not(id: nil) })
    end

    search2 != "" ? (scope :state_execution, -> { where(execution_state: search2) }) : (scope :state_execution, -> { where.not(id: nil) })
    search3 != "" ? (scope :state_invoice, -> { where(invoiced_state: search3) }) : (scope :state_invoice, -> { where.not(id: nil) })

    if search9 == "Incluidos"
      puts "incluidosssssssssssssssss cost"

      search4 != "" ? (scope :cost_center, -> { where(id: search4) }) : (scope :cost_center, -> { where.not(id: nil) })
    else
      puts "exosssssssssssssssss sotr"

      search4 != "" ? (scope :cost_center, -> { where.not(id: search4) }) : (scope :cost_center, -> { where.not(id: nil) })
    end

    search5 != "" ? (scope :service_type_scope, -> { where(service_type: search5) }) : (scope :service_type_scope, -> { where.not(id: nil) })
    search6 != "" ? (scope :date_desde_type_scope, -> { where(["start_date >= ?", search6]) }) : (scope :date_desde_type_scope, -> { where.not(id: nil) })
    search7 != "" ? (scope :date_hasta_type_scope, -> { where(["start_date <= ?", search7]) }) : (scope :date_hasta_type_scope, -> { where.not(id: nil) })

    return customer.state_execution.state_invoice.cost_center.service_type_scope.date_desde_type_scope.date_hasta_type_scope
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

    if self.quotation_number.blank? || self.quotation_number.nil?
      self.hour_real = Parameterization.where(name: "HORA HOMBRE COSTO").first.money_value
      self.hour_cotizada = Parameterization.where(name: "HORA HOMBRE COTIZADA").first.money_value
      self.hours_contractor_real = 0
      self.hours_contractor_invoices = 0
      self.displacement_hours = 0
      self.value_displacement_hours = Parameterization.where(name: "HORA DESPLAZAMIENTO").first.money_value
    end

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
    self.last_user_edited_id = !User.current.nil? ? User.current.id : 1
    self.engineering_value = self.hour_cotizada * self.eng_hours
    if self.invoiced_state == "PENDIENTE DE COTIZACION" && !self.quotation_number.blank? && !self.quotation_number.nil? && (self.quotation_number != "N/A")
      self.invoiced_state = "PENDIENTE DE ORDEN DE COMPRA"
    end

    if self.customer_id_changed?
      names = []
      customers = Customer.where(id: self.customer_id_change)
      customers.each do |cliente|
        names << cliente.name
      end
      customer = "<p>El Cliente: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>" #self.customer.name
    else
      customer = ""
    end

    puts "change_statechange_statechange_statechange_statechange_statechange_statechange_statechange_statechange_state"

    if self.contact_id_changed?
      namesClient = []
      contact = Contact.where(id: self.contact_id_change)
      contact.each do |contacto|
        namesClient << contacto.name
      end
      contact = "<p>El Contacto: <b class='color-true'>#{namesClient[1]}</b> / <b class='color-false'>#{namesClient[0]}</p>"
    else
      contact = ""
    end

    descripcion = self.description_changed? == true ? ("<p>La descripcion: <b class='color-true'>#{self.description_change[0]}</b> / <b class='color-false'>#{self.description_change[1]}</b></p>") : ""
    fecha_star = self.start_date_changed? == true ? ("<p>La Fecha de inicio: <b class='color-true'>#{self.start_date_change[0]}</b> / <b class='color-false'>#{self.start_date_change[1]}</b></p>") : ""
    fecha_end = self.end_date_changed? == true ? ("<p>La Fecha final: <b class='color-true'>#{self.end_date_change[0]}</b> / <b class='color-false'>#{self.end_date_change[1]}</b></p>") : ""
    quotation_number = self.quotation_number_changed? == true ? ("<p>El Número de cotización: <b class='color-true'>#{self.quotation_number_change[0]}</b> / <b class='color-false'>#{self.quotation_number_change[1]}</b></p>") : ""
    materials_value = self.materials_value_changed? == true ? ("<p>El Valor de los materiales: <b class='color-true'>#{self.materials_value_change[0]}</b> / <b class='color-false'>#{self.materials_value_change[1]}</b></p>") : ""
    eng_hours = self.eng_hours_changed? == true ? ("<p>La Horas ingeniería: <b class='color-true'>#{self.eng_hours_change[0]}</b> / <b class='color-false'>#{self.eng_hours_change[1]}</b></p>") : ""
    hour_real = self.hour_real_changed? == true ? ("<p>El Valor hora costo: <b class='color-true'>#{self.hour_real_change[0]}</b> / <b class='color-false'>#{self.hour_real_change[1]}</b></p>") : ""
    hour_cotizada = self.hour_cotizada_changed? == true ? ("<p>La Hora de valor cotizada: <b class='color-true'>#{self.hour_cotizada_change[0]}</b> / <b class='color-false'>#{self.hour_cotizada_change[1]}</b></p>") : ""
    hours_contractor = self.hours_contractor_changed? == true ? ("<p>Las Horas tablerista: <b class='color-true'>#{self.hours_contractor_change[0]}</b> / <b class='color-false'>#{self.hours_contractor_change[1]}</b></p>") : ""
    hours_contractor_real = self.hours_contractor_real_changed? == true ? ("<p>EL Valor hora Costo: <b class='color-true'>#{self.hours_contractor_real_change[0]}</b> / <b class='color-false'>#{self.hours_contractor_real_change[1]}</b></p>") : ""
    hours_contractor_invoices = self.hours_contractor_invoices_changed? == true ? ("<p>El Valor hora cotizada: <b class='color-true'>#{self.hours_contractor_invoices_change[0]}</b> / <b class='color-false'>#{self.hours_contractor_invoices_change[1]}</b></p>") : ""
    displacement_hours = self.displacement_hours_changed? == true ? ("<p>Las Horas de desplazamiento: <b class='color-true'>#{self.displacement_hours_change[0]}</b> / <b class='color-false'>#{self.displacement_hours_change[1]}</b></p>") : ""
    value_displacement_hours = self.value_displacement_hours_changed? == true ? ("<p>El Valor de hora de desplazamiento: <b class='color-true'>#{self.value_displacement_hours_change[0]}</b> / <b class='color-false'>#{self.value_displacement_hours_change[1]}</b></p>") : ""
    viatic_value = self.viatic_value_changed? == true ? ("<p>El Valor Viaticos: <b class='color-true'>#{self.viatic_value_change[0]}</b> / <b class='color-false'>#{self.viatic_value_change[1]}</b></p>") : ""
    quotation_value = self.quotation_value_changed? == true ? ("<p>El Total Cotizacion: <b class='color-true'>#{self.quotation_value_change[0]}</b> / <b class='color-false'>#{self.quotation_value_change[1]}</b></p>") : ""
    invoiced_state = self.invoiced_state_changed? == true ? ("<p>El Estado: <b class='color-true'>#{self.invoiced_state_change[0]}</b> / <b class='color-false'>#{self.invoiced_state_change[1]}</b></p>") : ""

    str = "#{customer}#{contact}#{descripcion}#{fecha_star}#{fecha_end}#{quotation_number}#{materials_value}#{eng_hours}#{hour_real}#{hour_cotizada}#{hours_contractor}#{hours_contractor_real}#{hours_contractor_invoices}#{displacement_hours}#{value_displacement_hours}#{viatic_value}#{quotation_value}#{invoiced_state}"

    if str.length > 5
      str = "<p>Centro de costos: #{self.code}</p> " + str

      RegisterEdit.create(
        user_id: User.current.id,
        register_user_id: self.user_id,
        state: "pending",
        date_update: Time.now,
        module: "Centro de costo",
        description: str,
      )
    end
  end

  def change_state_cost_center
    cost_center = CostCenter.find(self.id)
    sum_invoices = CustomerInvoice.where(cost_center_id: self.id).sum(:invoice_value)
    sales_order_sum = SalesOrder.where(cost_center_id: self.id).sum(:order_value)
    customer_invoice = CustomerInvoice.where(cost_center_id: self.id).sum(:invoice_value)
    CustomerInvoice.where(cost_center_id: self.id).each do |en|
      puts en.invoice_value
    end
    puts "asfadsfdasfdafasfadsfadsfdsafdfdasfdasfsdfadsfdsafdd"
    puts customer_invoice
    puts sales_order_sum
    puts cost_center.quotation_value
    cost_center.quotation_value = cost_center.quotation_value.nil? ? 0 : cost_center.quotation_value
    if (cost_center.quotation_value <= customer_invoice && customer_invoice > 0)
      self.invoiced_state = "FACTURADO"
    elsif (customer_invoice > 0 && customer_invoice < cost_center.quotation_value)
      self.invoiced_state = "FACTURADO PARCIAL"
    elsif (customer_invoice <= 0 && !self.quotation_number.blank? && !self.quotation_number.nil?)
      if (cost_center.quotation_value <= sales_order_sum + 1000 && customer_invoice == 0)
        self.invoiced_state = "LEGALIZADO"
      elsif (sales_order_sum > 0 && sales_order_sum < cost_center.quotation_value && sum_invoices == 0 && customer_invoice == 0)
        self.invoiced_state = "LEGALIZADO PARCIAL"
      elsif (sales_order_sum == 0 && customer_invoice == 0)
        self.invoiced_state = "PENDIENTE DE ORDEN DE COMPRA"
      end
    end
  end
end

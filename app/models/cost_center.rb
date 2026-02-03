# == Schema Information
#
# Table name: cost_centers
#
#  id                        :bigint           not null, primary key
#  aiu                       :float            default(0.0)
#  aiu_percent               :float            default(0.0)
#  aiu_percent_real          :float            default(0.0)
#  aiu_real                  :float            default(0.0)
#  code                      :string
#  cont_costo_cotizado       :float            default(0.0)
#  cont_costo_porcentaje     :float            default(0.0)
#  cont_costo_real           :float            default(0.0)
#  cont_horas_eje            :float            default(0.0)
#  cont_horas_porcentaje     :float            default(0.0)
#  contractor_total_costo    :float            default(0.0)
#  count                     :integer
#  create_type               :boolean
#  description               :text
#  desp_horas_eje            :float            default(0.0)
#  desp_horas_porcentaje     :float            default(0.0)
#  displacement_hours        :float
#  end_date                  :date
#  eng_hours                 :float
#  engineering_value         :float
#  execution_state           :string
#  fact_porcentaje           :float            default(0.0)
#  fact_real                 :float            default(0.0)
#  has_many_quotes           :boolean          default(FALSE)
#  hour_cotizada             :float
#  hour_real                 :float
#  hours_contractor          :float
#  hours_contractor_invoices :float
#  hours_contractor_real     :float
#  ing_costo_cotizado        :float            default(0.0)
#  ing_costo_porcentaje      :float            default(0.0)
#  ing_costo_real            :float            default(0.0)
#  ing_horas_eje             :float            default(0.0)
#  ing_horas_porcentaje      :float            default(0.0)
#  ingenieria_total_costo    :float            default(0.0)
#  invoiced_state            :string
#  mat_costo_porcentaje      :float            default(0.0)
#  mat_costo_real            :float            default(0.0)
#  materials_value           :float
#  offset_value              :float
#  quotation_number          :string
#  quotation_value           :float
#  sales_state               :string           default("SIN COMPRAS")
#  service_type              :string
#  start_date                :date
#  sum_contractor_costo      :float            default(0.0)
#  sum_contractor_cot        :float            default(0.0)
#  sum_contractors           :string
#  sum_executed              :string
#  sum_materials             :string
#  sum_materials_costo       :float            default(0.0)
#  sum_materials_cot         :float            default(0.0)
#  sum_materials_value       :float            default(0.0)
#  sum_viatic                :float
#  total_expenses            :float            default(0.0)
#  update_user               :integer
#  value_displacement_hours  :float
#  viat_costo_porcentaje     :float            default(0.0)
#  viat_costo_real           :float            default(0.0)
#  viatic_value              :float
#  work_force_contractor     :float
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  contact_id                :integer
#  customer_id               :integer
#  last_user_edited_id       :integer
#  user_id                   :integer
#  user_owner_id             :integer
#
# Indexes
#
#  index_cost_centers_on_contact_id           (contact_id)
#  index_cost_centers_on_created_at           (created_at)
#  index_cost_centers_on_customer_id          (customer_id)
#  index_cost_centers_on_execution_state      (execution_state)
#  index_cost_centers_on_invoiced_state       (invoiced_state)
#  index_cost_centers_on_last_user_edited_id  (last_user_edited_id)
#  index_cost_centers_on_service_type         (service_type)
#  index_cost_centers_on_start_date           (start_date)
#  index_cost_centers_on_user_id              (user_id)
#  index_cost_centers_on_user_owner_id        (user_owner_id)
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
  has_many :report_expenses, dependent: :destroy
  has_many :commissions, dependent: :destroy
  has_many :quotations, dependent: :destroy

  belongs_to :customer, optional: :true
  belongs_to :contact, optional: :true
  belongs_to :user, optional: :true
  belongs_to :last_user_edited, :class_name => "User", optional: :true
  belongs_to :user_owner, :class_name => "User", optional: :true

  before_create :create_code
  after_create :create_quotation
  before_update :change_state
  before_update :change_state_cost_center

  before_save :calculate_costo
  after_create :create_create_register
  after_destroy :create_delete_register

  scope :filterCost, -> { where("service_type like 'PROYECTO' or service_type like 'SERVICIO'").where.not(execution_state: "FINALIZADO") }
  scope :tableristas, -> { where(service_type: "PROYECTO") }

  def self.search(description, customer_id, execution_state, invoiced_state, cost_center_id, service_type, date_desde, date_hasta, quotation_number)
    scope = all
    scope = scope.where("LOWER(description) LIKE ?", "%#{description.downcase}%") if description.present?
    scope = scope.where(customer_id: customer_id) if customer_id.present?
    scope = scope.where(execution_state: execution_state) if execution_state.present?
    scope = scope.where(invoiced_state: invoiced_state) if invoiced_state.present?
    scope = scope.where(id: cost_center_id) if cost_center_id.present?
    scope = scope.where(service_type: service_type) if service_type.present?
    scope = scope.where("start_date >= ?", date_desde) if date_desde.present?
    scope = scope.where("start_date <= ?", date_hasta) if date_hasta.present?
    scope = scope.where("LOWER(quotation_number) LIKE ?", "%#{quotation_number.downcase}%") if quotation_number.present?
    scope
  end

  def self.searchInfo(customer_ids, execution_states, invoiced_states, cost_center_ids, service_types, date_desde, date_hasta, customer_mode, cost_center_mode)
    customer_ids = customer_ids.present? ? customer_ids.split(/,/) : nil
    execution_states = execution_states.present? ? execution_states.split(/,/) : nil
    invoiced_states = invoiced_states.present? ? invoiced_states.split(/,/) : nil
    cost_center_ids = cost_center_ids.present? ? cost_center_ids.split(/,/) : nil
    service_types = service_types.present? ? service_types.split(/,/) : nil

    scope = all

    if customer_ids.present?
      scope = customer_mode == "Incluidos" ? scope.where(customer_id: customer_ids) : scope.where.not(customer_id: customer_ids)
    end

    scope = scope.where(execution_state: execution_states) if execution_states.present?
    scope = scope.where(invoiced_state: invoiced_states) if invoiced_states.present?

    if cost_center_ids.present?
      scope = cost_center_mode == "Incluidos" ? scope.where(id: cost_center_ids) : scope.where.not(id: cost_center_ids)
    end

    scope = scope.where(service_type: service_types) if service_types.present?
    scope = scope.where("start_date >= ?", date_desde) if date_desde.present?
    scope = scope.where("start_date <= ?", date_hasta) if date_hasta.present?
    scope
  end

  def create_code
    self.has_many_quotes = true
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
    if !self.has_many_quotes
      self.ingenieria_total_costo = self.eng_hours * self.hour_real
      self.engineering_value = self.eng_hours * self.hour_cotizada
      self.contractor_total_costo = self.hours_contractor * self.hours_contractor_real
      self.work_force_contractor = self.hours_contractor * self.hours_contractor_invoices

      if self.displacement_hours.present? || self.value_displacement_hours.present?
        valor = self.displacement_hours * self.hour_real
        self.offset_value = valor
      end
    end
  end

  def change_state
    self.last_user_edited_id = !User.current.nil? ? User.current.id : 1
    if !self.has_many_quotes
      self.engineering_value = self.hour_cotizada * self.eng_hours
    end
    if self.invoiced_state == "PENDIENTE DE COTIZACION" && !self.quotation_number.blank? && !self.quotation_number.nil? && (self.quotation_number != "N/A")
      self.invoiced_state = "PENDIENTE DE ORDEN DE COMPRA"
    end

    if self.customer_id_changed?
      names = []
      customers = Customer.where(id: self.customer_id_change)
      customers.each do |cliente|
        names << cliente.name
      end
      customer = "<p>El Cliente: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      customer = ""
    end

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
      str = "<p><strong>(SE EDITO EL SIGUIENTE REGISTRO)</strong></p> <p>Centro de costos: #{self.code}</p> " + str

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

  def create_create_register
    self.last_user_edited_id = !User.current.nil? ? User.current.id : 1
    if !self.has_many_quotes
      self.engineering_value = self.hour_cotizada * self.eng_hours
    end
    if self.invoiced_state == "PENDIENTE DE COTIZACION" && !self.quotation_number.blank? && !self.quotation_number.nil? && (self.quotation_number != "N/A")
      self.invoiced_state = "PENDIENTE DE ORDEN DE COMPRA"
    end

    cliente = Customer.find(self.customer_id)
    customer = "<p>El Cliente: <b>#{cliente.name}</b>"

    contacto = Contact.where(id: self.contact_id)
    contact = "<p>El Contacto: <b>#{contacto.first&.name}</b>"

    descripcion = "<p>La descripcion: <b>#{self.description}</b>"
    fecha_star = "<p>La Fecha de inicio: <b>#{self.start_date}</b>"
    fecha_end = "<p>La Fecha final: <b>#{self.end_date}</b>"
    quotation_number = "<p>El Número de cotización: <b>#{self.quotation_number}</b>"
    materials_value = "<p>El Valor de los materiales: <b>#{self.materials_value}</b>"
    eng_hours = "<p>La Horas ingeniería: <b>#{self.eng_hours}</b>"
    hour_real = "<p>El Valor hora costo: <b>#{self.hour_real}</b>"
    hour_cotizada = "<p>La Hora de valor cotizada: <b>#{self.hour_cotizada}</b>"
    hours_contractor = "<p>Las Horas tablerista: <b>#{self.hours_contractor}</b>"
    hours_contractor_real = "<p>EL Valor hora Costo: <b>#{self.hours_contractor}</b> "
    hours_contractor_invoices = "<p>El Valor hora cotizada: <b>#{self.hours_contractor_invoices}</b>"
    displacement_hours = "<p>Las Horas de desplazamiento: <b>#{self.displacement_hours}</b>"
    value_displacement_hours ="<p>El Valor de hora de desplazamiento: <b>#{self.value_displacement_hours}</b>"
    viatic_value = "<p>El Valor Viaticos: <b>#{self.viatic_value}</b>"
    quotation_value = "<p>El Total Cotizacion: <b>#{self.quotation_value}</b>"
    invoiced_state = "<p>El Estado: <b>#{self.invoiced_state}</b>"

    str = "#{customer}#{contact}#{descripcion}#{fecha_star}#{fecha_end}#{quotation_number}#{materials_value}#{eng_hours}#{hour_real}#{hour_cotizada}#{hours_contractor}#{hours_contractor_real}#{hours_contractor_invoices}#{displacement_hours}#{value_displacement_hours}#{viatic_value}#{quotation_value}#{invoiced_state}"

    if str.length > 5
      str = "<p><strong>(SE CREO EL SIGUIENTE REGISTRO)</strong></p> <p>Centro de costos: #{self.code}</p> " + str

      RegisterEdit.create(
        user_id: User.current.id,
        register_user_id: self.user_id,
        state: "pending",
        date_update: Time.now,
        module: "Centro de costo",
        description: str,
        type_edit: "creo"
      )
    end
  end

  def create_delete_register
    if !self.has_many_quotes
      self.engineering_value = self.hour_cotizada * self.eng_hours
    end
    if self.invoiced_state == "PENDIENTE DE COTIZACION" && !self.quotation_number.blank? && !self.quotation_number.nil? && (self.quotation_number != "N/A")
      self.invoiced_state = "PENDIENTE DE ORDEN DE COMPRA"
    end

    cliente = Customer.find(self.customer_id)
    customer = "<p>El Cliente: <b>#{cliente.name}</b>"

    contacto = Contact.where(id: self.contact_id)
    contact = "<p>El Contacto: <b>#{contacto.first&.name}</b>"

    descripcion = "<p>La descripcion: <b>#{self.description}</b>"
    fecha_star = "<p>La Fecha de inicio: <b>#{self.start_date}</b>"
    fecha_end = "<p>La Fecha final: <b>#{self.end_date}</b>"
    quotation_number = "<p>El Número de cotización: <b>#{self.quotation_number}</b>"
    materials_value = "<p>El Valor de los materiales: <b>#{self.materials_value}</b>"
    eng_hours = "<p>La Horas ingeniería: <b>#{self.eng_hours}</b>"
    hour_real = "<p>El Valor hora costo: <b>#{self.hour_real}</b>"
    hour_cotizada = "<p>La Hora de valor cotizada: <b>#{self.hour_cotizada}</b>"
    hours_contractor = "<p>Las Horas tablerista: <b>#{self.hours_contractor}</b>"
    hours_contractor_real = "<p>EL Valor hora Costo: <b>#{self.hours_contractor}</b> "
    hours_contractor_invoices = "<p>El Valor hora cotizada: <b>#{self.hours_contractor_invoices}</b>"
    displacement_hours = "<p>Las Horas de desplazamiento: <b>#{self.displacement_hours}</b>"
    value_displacement_hours ="<p>El Valor de hora de desplazamiento: <b>#{self.value_displacement_hours}</b>"
    viatic_value = "<p>El Valor Viaticos: <b>#{self.viatic_value}</b>"
    quotation_value = "<p>El Total Cotizacion: <b>#{self.quotation_value}</b>"
    invoiced_state = "<p>El Estado: <b>#{self.invoiced_state}</b>"

    str = "#{customer}#{contact}#{descripcion}#{fecha_star}#{fecha_end}#{quotation_number}#{materials_value}#{eng_hours}#{hour_real}#{hour_cotizada}#{hours_contractor}#{hours_contractor_real}#{hours_contractor_invoices}#{displacement_hours}#{value_displacement_hours}#{viatic_value}#{quotation_value}#{invoiced_state}"

    if str.length > 5
      str = "<p><strong>(SE ELIMINO EL REGISTRO)</strong></p> <p>Centro de costos: #{self.code}</p> " + str

      RegisterEdit.create(
        user_id: User.current.id,
        register_user_id: self.user_id,
        state: "pending",
        date_update: Time.now,
        module: "Centro de costo",
        description: str,
        type_edit: "elimino"
      )
    end
  end

  def change_state_cost_center
    sum_invoices = self.customer_invoices.sum(:invoice_value)
    sales_order_sum = self.sales_orders.sum(:order_value)
    customer_invoice = sum_invoices
    qv = self.quotation_value || 0

    if (qv <= customer_invoice && customer_invoice > 0)
      self.invoiced_state = "FACTURADO"
    elsif (customer_invoice > 0 && customer_invoice < qv)
      self.invoiced_state = "FACTURADO PARCIAL"
    elsif (customer_invoice <= 0 && !self.quotation_number.blank? && !self.quotation_number.nil?)
      if (qv <= sales_order_sum + 1000 && customer_invoice == 0 && qv > 0)
        self.invoiced_state = "LEGALIZADO"
      elsif (sales_order_sum > 0 && sales_order_sum < qv && sum_invoices == 0 && customer_invoice == 0)
        self.invoiced_state = "LEGALIZADO PARCIAL"
      elsif (sales_order_sum == 0 && customer_invoice == 0)
        self.invoiced_state = "PENDIENTE DE ORDEN DE COMPRA"
      end
    end
  end

  def create_quotation
    if self.has_many_quotes
      quotation = Quotation.create(
        cost_center_id: self.id,
        description: self.description,
        quotation_number: self.quotation_number,
        eng_hours: self.eng_hours,
        engineering_value: self.engineering_value,
        hour_cotizada: self.hour_cotizada,
        hour_real: self.hour_real,
        hours_contractor: self.hours_contractor,
        hours_contractor_invoices: self.hours_contractor_invoices,
        hours_contractor_real: self.hours_contractor_real,
        ingenieria_total_costo: self.ingenieria_total_costo,
        materials_value: self.materials_value,
        quotation_value: self.quotation_value,
        value_displacement_hours: self.value_displacement_hours,
        displacement_hours: self.displacement_hours,
        viatic_value: self.viatic_value,
        work_force_contractor: self.work_force_contractor,
      )
    end
  end
end

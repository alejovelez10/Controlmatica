# == Schema Information
#
# Table name: customer_reports
#
#  id                  :bigint           not null, primary key
#  approve_date        :date
#  count               :integer
#  description         :text
#  email               :string
#  report_code         :string
#  report_date         :date
#  report_state        :string
#  token               :string
#  update_user         :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  contact_id          :integer
#  cost_center_id      :integer
#  customer_id         :integer
#  last_user_edited_id :integer
#  user_id             :integer
#
# Indexes
#
#  index_customer_reports_on_cost_center_id  (cost_center_id)
#

class CustomerReport < ApplicationRecord
  has_and_belongs_to_many :reports, dependent: :destroy
  belongs_to :user, optional: true
  belongs_to :cost_center, optional: true
  belongs_to :customer, optional: true
  belongs_to :contact, optional: true
  belongs_to :last_user_edited, :class_name => "User", optional: :true
  
  before_create :generate_token
  #after_create :send_approval_email
  before_update :create_edit_register

  def generate_token
    self.token = SecureRandom.hex(15)
    count = CustomerReport.where(cost_center_id: self.cost_center_id).maximum(:count)
    self.count = count == 0 || count.blank? || count.nil? ? 1 : count + 1
    self.report_code = self.cost_center.code + "-" + self.count.to_s
  end

  def self.search(search1, search2, search3, search4, search5)
    search1 != "" ? (scope :centro, -> { where(cost_center_id: search1) }) : (scope :centro, -> { where.not(id: nil) })
    search2 != "" ? (scope :customer, -> { where(customer_id: search2) }) : (scope :customer, -> { where.not(id: nil) })
    search3 != "" ? (scope :estado, -> { where("report_state like '%#{search3.downcase}%' or report_state like '%#{search3.upcase}%' or report_state like '%#{search3.capitalize}%' ") }) : (scope :estado, -> { where.not(id: nil) })
    search4 != "" ? (scope :fdesdep, -> { where(["report_date > ?", search4]) }) : (scope :fdesdep, -> { where.not(id: nil) })
    search5 != "" ? (scope :fhastap, -> { where(["report_date < ?", search5]) }) : (scope :fhastap, -> { where.not(id: nil) })
    centro.customer.estado.fdesdep.fhastap
  end

  #mostrar los que tenga como responsable esa persona en reportes de cliente

  def create_edit_register
    self.last_user_edited_id = User.current.id
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

    if self.contact_id_changed?
      namesClient = []
      contact = Contact.where(id: self.contact_id_change)
      contact.each do |contacto|
        namesClient << contacto.name
      end
      contact = "<p>El que Aprueba el Reporte: <b class='color-true'>#{namesClient[1]}</b> / <b class='color-false'>#{namesClient[0]}</p>"
    else
      contact = ""
    end

    report_date = self.report_date_changed? == true ? ("<p>La Fecha del reporte: <b class='color-true'>#{self.report_date_change[0]}</b> / <b class='color-false'>#{self.report_date_change[1]}</b></p>") : ""
    description = self.description_changed? == true ? ("<p>La Descripcion: <b class='color-true'>#{self.description_change[0]}</b> / <b class='color-false'>#{self.description_change[1]}</b></p>") : ""

    str = "#{customer}#{centro}#{contact}#{description}#{report_date}"

    RegisterEdit.create(
      user_id: self.update_user,
      register_user_id: self.id,
      state: "pending",
      date_update: Time.now,
      module: "Reportes de clientes",
      description: str,
    )
  end
end

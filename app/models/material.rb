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
#  update_user             :integer
#  last_user_edited_id     :integer
#
class Material < ApplicationRecord
  belongs_to :cost_center
  belongs_to :provider
  after_save :calculate_cost
  belongs_to :last_user_edited, :class_name => "User", optional: :true
  has_many :material_invoices, dependent: :destroy
  belongs_to :user, optional: :true

  after_destroy :calculate_cost_destroy
  before_destroy :create_delete_register
  after_create :create_create_register
  before_update :create_edit_register
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
    cost_center.update(sum_materials_value: sum_materials_costo, sales_state: "COMPRANDO")
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

  def create_edit_register
    self.last_user_edited_id = User.current.id
    if self.provider_id_changed?
      names = []
      providers = Provider.where(id: self.provider_id_change)
      providers.each do |provider|
        names << provider.name
      end
      provider = "<p>El Proveedor: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      provider = ""
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

    sales_date = self.sales_date_changed? == true ? ("<p>La Fecha de orden: <b class='color-true'>#{self.sales_date_change[0]}</b> / <b class='color-false'>#{self.sales_date_change[1]}</b></p>") : ""
    sales_number = self.sales_number_changed? == true ? ("<p>EL Numero de orden: <b class='color-true'>#{self.sales_number_change[0]}</b> / <b class='color-false'>#{self.sales_number_change[1]}</b></p>") : ""
    amount = self.amount_changed? == true ? ("<p>El Valor: <b class='color-true'>#{self.amount_change[0]}</b> / <b class='color-false'>#{self.amount_change[1]}</b></p>") : ""
    delivery_date = self.delivery_date_changed? == true ? ("<p>La Fecha estimada de entrega: <b class='color-true'>#{self.delivery_date_change[0]}</b> / <b class='color-false'>#{self.delivery_date_change[1]}</b></p>") : ""
    description = self.description_changed? == true ? ("<p>La Descripcion: <b class='color-true'>#{self.description_change[0]}</b> / <b class='color-false'>#{self.description_change[1]}</b></p>") : ""

    str = "#{provider}#{centro}#{sales_date}#{sales_number}#{amount}#{delivery_date}#{description}"

    if str.length > 5
      str = "<p><strong>(SE EDITO EL SIGUIENTE REGISTRO)</strong></p> <p>Numero de orden: #{self.sales_number}</p> <p>Centro de costos: #{self.cost_center.code}</p>" + str
      RegisterEdit.create(
        user_id:  User.current.id,
        register_user_id: self.user_id,
        state: "pending",
        date_update: Time.now,
        module: "Materiales",
        description: str,
      )
    end
  end
  
  def create_create_register
    self.last_user_edited_id = User.current.id

    if self.provider_id != nil
      
      provider = Provider.find(self.provider_id)

    else
      provider = ""
    end
  
    sales_date = "<p>Fecha de orden: #{self.sales_date}</p>"
    provider_ = "<p>Proveedor: #{provider.name}</p> "
    amount = "<p>Valor: #{self.amount}</p>"
    delivery_date = "<p>Fecha estimada de entrega: #{self.delivery_date}</p>"
    description = "<p>Descripcion: #{self.description}</p> "

    str = "#{sales_date}#{provider_}#{amount}#{delivery_date}#{description}"

    if str.length > 5
      str = "<p><strong>(SE CREO EL SIGUIENTE REGISTRO)</strong></p> <p>Numero de orden: #{self.sales_number}</p> <p>Centro de costos: #{self.cost_center.code}</p>" + str
      RegisterEdit.create(
        user_id:  User.current.id,
        register_user_id: self.user_id,
        state: "pending",
        date_update: Time.now,
        module: "Materiales",
        description: str,
        type_edit: "creo"
      )
    end
  end

  def create_delete_register
    self.last_user_edited_id = User.current.id

    if self.provider_id != nil
      
      provider = Provider.find(self.provider_id)

    else
      provider = ""
    end
  
    sales_date = "<p>Fecha de orden: #{self.sales_date}</p>"
    provider_ = "<p>Proveedor: #{provider.name}</p> "
    amount = "<p>Valor: #{self.amount}</p>"
    delivery_date = "<p>Fecha estimada de entrega: #{self.delivery_date}</p>"
    description = "<p>Descripcion: #{self.description}</p> "

    str = "#{sales_date}#{provider_}#{amount}#{delivery_date}#{description}"

    if str.length > 5
      str = "<p><strong>(SE ELIMINO EL SIGUIENTE REGISTRO)</strong></p> <p>Numero de orden: #{self.sales_number}</p> <p>Centro de costos: #{self.cost_center.code}</p>" + str
      RegisterEdit.create(
        user_id:  User.current.id,
        register_user_id: self.user_id,
        state: "pending",
        date_update: Time.now,
        module: "Materiales",
        description: str,
        type_edit: "elimino"
      )
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

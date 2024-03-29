# == Schema Information
#
# Table name: sales_orders
#
#  id                  :bigint           not null, primary key
#  created_date        :date
#  order_number        :string
#  order_value         :float
#  state               :string
#  order_file          :string
#  cost_center_id      :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  user_id             :integer
#  description         :text
#  sum_invoices        :float
#  update_user         :integer
#  last_user_edited_id :integer
#

class SalesOrder < ApplicationRecord
  belongs_to :cost_center, optional: true
  mount_uploader :order_file, OrderUploader
  after_save :change_state_cost_center
  has_many :customer_invoices, dependent: :destroy
  after_destroy :change_state_cost_center_destroy
  belongs_to :user, optional: :true
  belongs_to :last_user_edited, :class_name => "User", optional: :true
  before_update :edit_values
  before_update :create_edit_register
  after_create :create_create_register
  after_destroy :create_delete_register

  def edit_values
    puts "last_user_edited_idlast_user_edited_idlast_user_edited_idlast_user_edited_id"
    self.last_user_edited_id = User.current.id
  end

  def change_state_cost_center
    cost_center = CostCenter.find(self.cost_center_id)
    sum_invoices = CustomerInvoice.where(cost_center_id: self.cost_center_id).sum(:invoice_value)
    sales_order_sum = SalesOrder.where(cost_center_id: self.cost_center_id).sum(:order_value)
    customer_invoice = CustomerInvoice.where(cost_center_id: self.cost_center_id).sum(:invoice_value)
    CustomerInvoice.where(cost_center_id: self.cost_center_id).each do |en|
      puts en.invoice_value
    end
    puts "asfadsfdasfdafasfadsfadsfdsafdfdasfdasfsdfadsfdsafdd"
    puts customer_invoice
    puts sales_order_sum
    puts cost_center.quotation_value
    if (cost_center.quotation_value <= customer_invoice && customer_invoice > 0)
      CostCenter.find(self.cost_center_id).update(invoiced_state: "FACTURADO")
    elsif (customer_invoice > 0 && customer_invoice < cost_center.quotation_value)
      CostCenter.find(self.cost_center_id).update(invoiced_state: "FACTURADO PARCIAL")
    elsif (customer_invoice <= 0)
      if (cost_center.quotation_value <= sales_order_sum + 1000 && customer_invoice == 0)
        CostCenter.find(self.cost_center_id).update(invoiced_state: "LEGALIZADO")
      elsif (sales_order_sum > 0 && sales_order_sum < cost_center.quotation_value && sum_invoices == 0 && customer_invoice == 0)
        CostCenter.find(self.cost_center_id).update(invoiced_state: "LEGALIZADO PARCIAL")
      elsif (sales_order_sum == 0 && customer_invoice == 0)
        CostCenter.find(self.cost_center_id).update(invoiced_state: "PENDIENTE DE ORDEN DE COMPRA")
      end
    end
  end

  def self.search(search1, search2, search3, search4, search5, search6, search7, search8, search9)
    if search5.present?
      search5 = CostCenter.where(invoiced_state: search5)
    end

    if search7.present?
      search7 = CostCenter.where(customer_id: search7)
    end

    if search9.present?
      search9 = CostCenter.where(quotation_number: search9)
    end

    if search8.present?
      invoice = CustomerInvoice.find_by_number_invoice(search8)
      search8 = SalesOrder.joins(:customer_invoices).where("customer_invoices.id = '#{invoice.id}'")
    end

    search1 != "" ? (scope :fdesdep, -> { where(["created_date >= ?", search1]) }) : (scope :fdesdep, -> { where.not(id: nil) })
    search2 != "" ? (scope :fhastap, -> { where(["created_date <= ?", search2]) }) : (scope :fhastap, -> { where.not(id: nil) })
    search3 != "" ? (scope :number, -> { where(order_number: search3) }) : (scope :number, -> { where.not(id: nil) })
    search4 != "" ? (scope :centro, -> { where(cost_center_id: search4) }) : (scope :centro, -> { where.not(id: nil) })
    search5 != "" ? (scope :estado, -> { where(cost_center_id: search5.present? ? search5.ids : nil) }) : (scope :estado, -> { where.not(id: nil) })
    search6 != "" ? (scope :descripcion, -> { where("description like '%#{search6.downcase}%' or description like '%#{search6.upcase}%' or description like '%#{search6.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })
    search7 != "" ? (scope :customer, -> { where(cost_center_id: search7.present? ? search7.ids : nil) }) : (scope :customer, -> { where.not(id: nil) })
    search8 != "" ? (scope :number_invoice, -> { where(id: search8.present? ? search8.ids : nil) }) : (scope :number_invoice, -> { where.not(id: nil) })
    search9 != "" ? (scope :quotation_number, -> { where(cost_center_id: search9.present? ? search9.ids : nil) }) : (scope :quotation_number, -> { where.not(id: nil) })

    fdesdep.fhastap.number.centro.estado.descripcion.customer.number_invoice.quotation_number
  end

  def change_state_cost_center_destroy
    cost_center = CostCenter.find(self.cost_center_id)
    puts "afadsfadsfadsfasdfasdfassfasdf"
    sum_invoices = CustomerInvoice.where(cost_center_id: self.cost_center_id).sum(:invoice_value)
    sales_order = SalesOrder.where(cost_center_id: self.cost_center_id).sum(:order_value)
    if (cost_center.quotation_value <= sales_order + 1000 && sum_invoices == 0)
      puts "2222222222222222"
      CostCenter.find(self.cost_center_id).update(invoiced_state: "LEGALIZADO")
    elsif (sales_order > 0 && sales_order < cost_center.quotation_value && sum_invoices == 0 && sum_invoices == 0)
      CostCenter.find(self.cost_center_id).update(invoiced_state: "LEGALIZADO PARCIAL")
      puts "afadsfadsfadsfasdfasdfassfasdf11111"
    elsif (sales_order == 0 && sum_invoices == 0)
      CostCenter.find(self.cost_center_id).update(invoiced_state: "PENDIENTE DE ORDEN DE COMPRA")
    end
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

    created_date = self.created_date_changed? == true ? ("<p>La Fecha de generación: <b class='color-true'>#{self.created_date_change[0]}</b> / <b class='color-false'>#{self.created_date_change[1]}</b></p>") : ""
    order_number = self.order_number_changed? == true ? ("<p>La Numero de orden: <b class='color-true'>#{self.order_number_change[0]}</b> / <b class='color-false'>#{self.order_number_change[1]}</b></p>") : ""
    order_value = self.order_value_changed? == true ? ("<p>Valor: <b class='color-true'>#{self.order_value_change[0]}</b> / <b class='color-false'>#{self.order_value_change[1]}</b></p>") : ""
    description = self.description_changed? == true ? ("<p>La descripcion: <b class='color-true'>#{self.description_change[0]}</b> / <b class='color-false'>#{self.description_change[1]}</b></p>") : ""

    str = "#{created_date}#{order_number}#{order_value}#{centro}#{description}"

    if str.length > 5
      str = "<p><strong>(SE EDITO EL SIGUIENTE REGISTRO)</strong></p> <p>Orden de compra: #{self.order_number}</p> <p>Centro de costos: #{self.cost_center.code}</p>" + str
      RegisterEdit.create(
        user_id: User.current.id,
        register_user_id: self.user_id,
        state: "pending",
        date_update: Time.now,
        module: "Ordenes de Compra",
        description: str,
      )
    end
  end


  def create_create_register
    self.last_user_edited_id = User.current.id
    if self.cost_center_id_changed?
      names = []
      cost_center = CostCenter.where(id: self.cost_center_id_change)
      cost_center.each do |centro|
        names << centro.code
      end
      centro = " <p>El Centro de costo: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      centro = ""
    end

    created_date = self.created_date_changed? == true ? ("<p>La Fecha de generación: <b class='color-true'>#{self.created_date_change[0]}</b> / <b class='color-false'>#{self.created_date_change[1]}</b></p>") : ""
    order_number = self.order_number_changed? == true ? ("<p>La Numero de orden: <b class='color-true'>#{self.order_number_change[0]}</b> / <b class='color-false'>#{self.order_number_change[1]}</b></p>") : ""
    order_value = self.order_value_changed? == true ? ("<p>Valor: <b class='color-true'>#{self.order_value_change[0]}</b> / <b class='color-false'>#{self.order_value_change[1]}</b></p>") : ""
    description = self.description_changed? == true ? ("<p>La descripcion: <b class='color-true'>#{self.description_change[0]}</b> / <b class='color-false'>#{self.description_change[1]}</b></p>") : ""

    str = "#{created_date}#{order_number}#{order_value}#{centro}#{description}"

 
      str = "<p><p><strong>(SE CREO EL SIGUIENTE REGISTRO)</strong></p>Orden de compra: #{self.order_number}</p> <p>Centro de costos: #{self.cost_center.code}</p>" + str
      RegisterEdit.create(
        user_id: User.current.id,
        register_user_id: self.user_id,
        state: "pending",
        date_update: Time.now,
        module: "Ordenes de Compra",
        description: str,
        type_edit: "creo"
      )
  
  end

  def create_delete_register
    if self.cost_center_id_changed?
      names = []
      cost_center = CostCenter.where(id: self.cost_center_id_change)
      cost_center.each do |centro|
        names << centro.code
      end
      centro = " <p>El Centro de costo: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      centro = ""
    end

    created_date = self.created_date_changed? == true ? ("<p>La Fecha de generación: <b class='color-true'>#{self.created_date_change[0]}</b> / <b class='color-false'>#{self.created_date_change[1]}</b></p>") : ""
    order_number = self.order_number_changed? == true ? ("<p>La Numero de orden: <b class='color-true'>#{self.order_number_change[0]}</b> / <b class='color-false'>#{self.order_number_change[1]}</b></p>") : ""
    order_value = self.order_value_changed? == true ? ("<p>Valor: <b class='color-true'>#{self.order_value_change[0]}</b> / <b class='color-false'>#{self.order_value_change[1]}</b></p>") : ""
    description = self.description_changed? == true ? ("<p>La descripcion: <b class='color-true'>#{self.description_change[0]}</b> / <b class='color-false'>#{self.description_change[1]}</b></p>") : ""

    str = "#{created_date}#{order_number}#{order_value}#{centro}#{description}"

 
      str = "<p><p><strong>(SE ELIMINO EL SIGUIENTE REGISTRO)</strong></p> Orden de compra: #{self.order_number}</p> <p>Centro de costos: #{self.cost_center.code}</p>" + str
      RegisterEdit.create(
        user_id: User.current.id,
        register_user_id: self.user_id,
        state: "pending",
        date_update: Time.now,
        module: "Ordenes de Compra",
        description: str,
        type_edit: "elimino"
        
      )
  
  end


end

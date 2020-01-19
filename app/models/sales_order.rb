# == Schema Information
#
# Table name: sales_orders
#
#  id             :bigint           not null, primary key
#  created_date   :date
#  order_number   :string
#  order_value    :float
#  state          :string
#  order_file     :string
#  cost_center_id :integer
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  user_id        :integer
#  description    :text
#  sum_invoices   :float
#

class SalesOrder < ApplicationRecord
  belongs_to :cost_center, optional: true
  mount_uploader :order_file, OrderUploader
  after_save :change_state_cost_center
  has_many :customer_invoices, dependent: :destroy

  def change_state_cost_center
    cost_center = CostCenter.find(self.cost_center_id)
    sum_invoices = CustomerInvoice.where(cost_center_id: self.cost_center_id).sum(:invoice_value)
    sales_order = SalesOrder.where(cost_center_id: self.cost_center_id).sum(:order_value)
    if (cost_center.quotation_value <= sales_order + 1000 && sum_invoices == 0)
      CostCenter.find(self.cost_center_id).update(invoiced_state: "LEGALIZADO")
    elsif (sales_order > 0 && sales_order < cost_center.quotation_value && sum_invoices == 0 && sum_invoices == 0)
      CostCenter.find(self.cost_center_id).update(invoiced_state: "LEGALIZADO PARCIAL")
    end
  end

  def self.search(search1, search2, search3, search4, search5, search6)
    search1 != "" ? (scope :fdesdep, -> { where(["created_at > ?", search1]) }) : (scope :fdesdep, -> { where.not(id: nil) })
    search2 != "" ? (scope :fhastap, -> { where(["created_at < ?", search2]) }) : (scope :fhastap, -> { where.not(id: nil) })
    search3 != "" ? (scope :number, -> { where(order_number: search3) }) : (scope :number, -> { where.not(id: nil) })
    search4 != "" ? (scope :centro, -> { where(cost_center_id: search4) }) : (scope :centro, -> { where.not(id: nil) })
    search5 != "" ? (scope :estado, -> { where(state: search5) }) : (scope :estado, -> { where.not(id: nil) })
    search6 != "" ? (scope :descripcion, -> { where("description like '%#{search6.downcase}%' or description like '%#{search6.upcase}%' or description like '%#{search6.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })

    fdesdep.fhastap.number.centro.estado.descripcion
  end
end

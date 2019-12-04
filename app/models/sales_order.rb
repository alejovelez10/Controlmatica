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
#

class SalesOrder < ApplicationRecord
  belongs_to :cost_center, optional: true
  mount_uploader :order_file, OrderUploader
  after_create :change_state_cost_center
  has_many :customer_invoices

  def change_state_cost_center
    cost_center = CostCenter.find(self.cost_center_id)

    sales_order = SalesOrder.where(cost_center_id: self.cost_center_id).sum(:order_value)
    if (cost_center.quotation_value <= sales_order)
      CostCenter.find(self.cost_center_id).update(invoiced_state: "LEGALIZADO")
    end
  end
end

# == Schema Information
#
# Table name: sales_orders
#
#  id             :integer          not null, primary key
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
	belongs_to :cost_center , optional: true
	mount_uploader :order_file, OrderUploader
	after_create :change_state_cost_center


	def change_state_cost_center

		CostCenter.find(self.cost_center_id).update(invoiced_state: "LEGALIZADO")
		
	end
end

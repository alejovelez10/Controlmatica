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
#

class SalesOrderSerializer < ActiveModel::Serializer
  attributes :id, :created_date, :order_number, :order_value, :state, :order_file, :cost_center_id
end

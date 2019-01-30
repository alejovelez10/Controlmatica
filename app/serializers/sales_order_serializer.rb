class SalesOrderSerializer < ActiveModel::Serializer
  attributes :id, :created_date, :order_number, :order_value, :state, :order_file, :cost_center_id
end

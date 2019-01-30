json.extract! sales_order, :id, :created_date, :order_number, :order_value, :state, :order_file, :cost_center_id, :created_at, :updated_at
json.url sales_order_url(sales_order, format: :json)

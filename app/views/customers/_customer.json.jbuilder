json.extract! customer, :id, :client, :name, :phone, :address, :nit, :web, :email, :user_id, :created_at, :updated_at
json.url customer_url(customer, format: :json)

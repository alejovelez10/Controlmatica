json.extract! cost_center, :id, :customer_id, :contact_id, :description, :start_date, :end_date, :quotation_number, :engineering_value, :viatic_value, :execution_state, :invoiced_state, :service_type, :created_at, :updated_at
json.url cost_center_url(cost_center, format: :json)

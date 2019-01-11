json.extract! customer_report, :id, :report_date, :description, :token, :report_state, :report_code, :customer_id, :created_at, :updated_at
json.url customer_report_url(customer_report, format: :json)

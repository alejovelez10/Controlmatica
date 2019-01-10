json.extract! report, :id, :report_date, :user_id, :working_time, :work_description, :viatic_value, :viatic_description, :total_value, :created_at, :updated_at
json.url report_url(report, format: :json)

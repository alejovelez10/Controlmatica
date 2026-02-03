# == Schema Information
#
# Table name: reports
#
#  id                       :bigint           not null, primary key
#  code_report              :string
#  contact_email            :string
#  contact_name             :string
#  contact_phone            :string
#  contact_position         :string
#  count                    :integer
#  customer_name            :string
#  displacement_hours       :float
#  report_code              :integer
#  report_date              :date
#  report_sate              :boolean
#  total_value              :float
#  update_user              :integer
#  value_displacement_hours :float
#  viatic_description       :text
#  viatic_value             :float
#  work_description         :text
#  working_time             :float
#  working_value            :float
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  contact_id               :integer
#  cost_center_id           :integer
#  customer_id              :integer
#  last_user_edited_id      :integer
#  report_execute_id        :integer
#  user_id                  :integer
#
# Indexes
#
#  index_reports_on_contact_id           (contact_id)
#  index_reports_on_cost_center_id       (cost_center_id)
#  index_reports_on_customer_id          (customer_id)
#  index_reports_on_last_user_edited_id  (last_user_edited_id)
#  index_reports_on_report_date          (report_date)
#  index_reports_on_report_execute_id    (report_execute_id)
#  index_reports_on_report_sate          (report_sate)
#  index_reports_on_user_id              (user_id)
#

class ReportSerializer < ActiveModel::Serializer
  attributes :id, :total_value, :working_value, :viatic_value, :value_displacement_hours, :report_date, :code_report
end

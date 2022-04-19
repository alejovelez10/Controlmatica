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

class ReportSerializer < ActiveModel::Serializer
  attributes :id, :total_value, :working_value, :viatic_value, :value_displacement_hours, :report_date, :code_report
end

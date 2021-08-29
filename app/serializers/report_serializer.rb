# == Schema Information
#
# Table name: reports
#
#  id                       :bigint           not null, primary key
#  report_date              :date
#  user_id                  :integer
#  working_time             :float
#  working_value            :float
#  work_description         :text
#  viatic_value             :float
#  viatic_description       :text
#  total_value              :float
#  cost_center_id           :integer
#  report_execute_id        :integer
#  report_code              :string
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  code_report              :string
#  customer_name            :string
#  contact_name             :string
#  contact_email            :string
#  contact_phone            :string
#  contact_position         :string
#  customer_id              :integer
#  contact_id               :integer
#  report_sate              :boolean
#  count                    :integer
#  displacement_hours       :float
#  value_displacement_hours :float
#  update_user              :integer
#  last_user_edited_id      :integer
#

class ReportSerializer < ActiveModel::Serializer
  attributes :id, :total_value, :working_value, :viatic_value, :value_displacement_hours, :report_date, :code_report
end

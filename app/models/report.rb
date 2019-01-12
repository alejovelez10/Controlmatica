# == Schema Information
#
# Table name: reports
#
#  id                 :bigint(8)        not null, primary key
#  report_date        :date
#  user_id            :integer
#  working_time       :integer
#  work_description   :text
#  viatic_value       :integer
#  viatic_description :text
#  total_value        :integer
#  cost_center_id     :integer
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  report_code        :string
#

class Report < ApplicationRecord
	has_and_belongs_to_many :customer_reports
end

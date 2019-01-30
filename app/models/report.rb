# == Schema Information
#
# Table name: reports
#
#  id                 :bigint(8)        not null, primary key
#  report_date        :date
#  user_id            :integer
#  working_time       :integer
#  working_value      :float
#  work_description   :text
#  viatic_value       :float
#  viatic_description :text
#  total_value        :float
#  cost_center_id     :integer
#  report_execute_id  :integer
#  report_code        :string
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#

class Report < ApplicationRecord
	has_and_belongs_to_many :customer_reports
	belongs_to :cost_center
	before_save :create_total
	belongs_to :report_execute, :class_name => 'User'


	def create_total

		self.working_value = self.working_time * 10000
		self.total_value = self.viatic_value + (self.working_time * 10000)
        
		
	end
end

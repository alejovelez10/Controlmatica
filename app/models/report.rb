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
#  report_code        :integer
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#

class Report < ApplicationRecord
	has_and_belongs_to_many :customer_reports
	belongs_to :cost_center
	before_save :create_total
	belongs_to :report_execute, :class_name => 'User'
	before_save :create_code

	def create_code

		count = Report.maximum(:report_code)
		customer_prefix = Customer.find(self.cost_center.customer.id).code
		self.report_code = count == 0  || count.blank? || count.nil?   ?  1 :  count
	    self.code_report = "REP-" + customer_prefix +"-"+ self.report_code.to_s + "-" + Time.now.year.to_s
		
	end

	

	def create_total

		self.working_value = self.working_time * 10000
		self.total_value = self.viatic_value + (self.working_time * 10000)
        
		
	end
end

# == Schema Information
#
# Table name: reports
#
#  id                 :integer          not null, primary key
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
#  code_report        :string
#  customer_name      :string
#  contact_name       :string
#  contact_email      :string
#  contact_phone      :string
#  contact_position   :string
#  customer_id        :integer
#

class Report < ApplicationRecord
	has_and_belongs_to_many :customer_reports
	belongs_to :cost_center, optional: true
	before_save :create_total
	belongs_to :report_execute, :class_name => 'User'
	before_create :create_code
	before_create :coste_center_verify
	after_create :save_report_in_cost_center



	def create_code
       puts self.cost_center.nil?  
		if self.cost_center != nil 
		
		puts "hhahahahjahahahahahahahahah"
		puts self.cost_center
		count = Report.maximum(:report_code)
		customer_prefix = Customer.find(self.cost_center.customer.id).code
		self.report_code = count == 0  || count.blank? || count.nil?   ?  1 :  count
	    self.code_report = "REP-" + customer_prefix +"-"+ self.report_code.to_s + "-" + Time.now.year.to_s
	    self.save
		end

		
	end

	

	def create_total

		self.working_value = self.working_time * 10000
		self.total_value = self.viatic_value + (self.working_time * 10000)
        
		
	end
	def coste_center_verify
		puts "3333333333333333"
		puts self.customer_id
		 if self.cost_center_id == nil

		 	CostCenter.create(customer_id: self.customer_id, service_type: "Servicio", create_type:false,viatic_value: 0,engineering_value:0,)
		 end
		
	end

	def save_report_in_cost_center

		self.cost_center_id = CostCenter.last.id
		puts "22222222222222222"
		count = Report.maximum(:report_code)
		customer_prefix = Customer.find(self.cost_center.customer.id).code
		self.report_code = count == 0  || count.blank? || count.nil?   ?  1 :  count
	    self.code_report = "REP-" + customer_prefix +"-"+ self.report_code.to_s + "-" + Time.now.year.to_s
	    self.save
		
	end
end

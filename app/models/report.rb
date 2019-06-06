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
#  code_report        :string
#  customer_name      :string
#  contact_name       :string
#  contact_email      :string
#  contact_phone      :string
#  contact_position   :string
#  customer_id        :integer
#  contact_id         :integer
#  report_sate        :boolean
#

class Report < ApplicationRecord
	has_and_belongs_to_many :customer_reports
	belongs_to :cost_center, optional: true
	before_save :create_total
	belongs_to :report, optional: true
	belongs_to :report_execute, :class_name => 'User'
	before_create :create_code
	belongs_to :contact, optional: true
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

		 	CostCenter.create(customer_id: self.customer_id, service_type: "Servicio", create_type:false,viatic_value: 0,engineering_value:0,eng_hours: 0,quotation_value: 0,execution_state: "EJECUCION")
		 
		 else
		 	CostCenter.find(self.cost_center_id).update(execution_state:"EJECUCION")
		 end
		 
		 if self.contact_id == nil

		 	Contact.create(customer_id: self.customer_id, name: self.contact_name, email: self.contact_email , phone:self.contact_phone, position: self.contact_position,user_id:self.user_id)
		 else
		 	contact = Contact.find(self.contact_id)
		 	self.contact_name = contact.name
		 	self.contact_position = contact.position
		 	self.contact_email = contact.email
		 	self.contact_phone = contact.phone
		 	CostCenter.last.update(contact_id: contact.id)
		 end
		
	end

	def save_report_in_cost_center

		self.cost_center_id = CostCenter.last.id
		puts "22222222222222222"
		count = Report.maximum(:report_code)
		customer_prefix = Customer.find(self.cost_center.customer.id).code
		self.report_code = count == 0  || count.blank? || count.nil?   ?  1 :  count+ 1
	    self.code_report = "REP-" + customer_prefix +"-"+ self.report_code.to_s + "-" + Time.now.year.to_s
	    self.save
		
	end
end

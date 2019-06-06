# == Schema Information
#
# Table name: cost_centers
#
#  id                :integer          not null, primary key
#  customer_id       :integer
#  contact_id        :integer
#  description       :text
#  start_date        :date
#  end_date          :date
#  quotation_number  :string
#  engineering_value :float
#  viatic_value      :float
#  execution_state   :string
#  invoiced_state    :string
#  service_type      :string
#  code              :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  count             :integer
#  create_type       :bool
#  eng_hours         :float
#  hour_cotizada     :float
#  hour_real         :float
#  quotation_value   :float
#

class CostCenter < ApplicationRecord
	has_many :reports  , dependent: :destroy
	has_many :customer_reports , dependent: :destroy
	has_many :sales_orders, dependent: :destroy
	has_many :customer_invoices, dependent: :destroy
	
	belongs_to :customer, optional: :true
	belongs_to :contact, optional: :true
	before_create :create_code
	before_update :change_state

	def create_code
        

		count = CostCenter.where(service_type: self.service_type).maximum(:count)
		customer_prefix = Customer.find(self.customer_id).code
		self.count = count == 0  || count.blank? || count.nil?   ?  1 :  count + 1	
		prefix = self.service_type.slice(0,3).upcase
		self.code = prefix + "-" + customer_prefix +"-" + self.count.to_s + "-" + Time.now.year.to_s
	    self.hour_real = Parameterization.where(name: "HORA HOMBRE COSTO").first.money_value
	    self.hour_cotizada = Parameterization.where(name: "HORA HOMBRE COTIZADA").first.money_value
		self.invoiced_state =   self.quotation_number.blank? || self.quotation_number.nil? || self.quotation_number == "" ? "PENDIENTE DE COTIZACION" : "PENDIENTE DE ORDEN DE COMPRA" 
	end

	def change_state
		puts("wewewe")
		puts !self.quotation_number.blank?
		puts !self.quotation_number.nil?
		
		puts self.invoiced_state == "PENDIENTE DE COTIZACION"

		if self.invoiced_state == "PENDIENTE DE COTIZACION"  && !self.quotation_number.blank? && !self.quotation_number.nil?
			puts("hoasfhasddaslkdjdkljskfa")
			self.invoiced_state = "PENDIENTE DE ORDEN DE COMPRA"

		end

		
	end

end

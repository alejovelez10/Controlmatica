# == Schema Information
#
# Table name: customer_reports
#
#  id             :bigint(8)        not null, primary key
#  report_date    :date
#  description    :text
#  token          :string
#  report_state   :string
#  report_code    :string
#  customer_id    :integer
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  user_id        :integer
#  cost_center_id :integer
#  contact_id     :integer
#  count          :integer
#  approve_date   :date
#

class CustomerReport < ApplicationRecord
	has_and_belongs_to_many :reports, dependent: :destroy
	belongs_to :user, optional:true
	belongs_to :cost_center, optional: true
	belongs_to :customer, optional:true
	belongs_to :contact, optional: true
	before_create :generate_token
	after_create :send_approval_email



	def generate_token

		self.token = SecureRandom.hex(15)
		count = CustomerReport.where(cost_center_id: self.cost_center_id).maximum(:count)
		self.count = count == 0  || count.blank? || count.nil?   ?  1 :  count + 1
		self.report_code = self.cost_center.code + "-" + self.count.to_s
		
	end

	def send_approval_email

		

		
	end
end

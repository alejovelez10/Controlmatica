# == Schema Information
#
# Table name: customer_reports
#
#  id             :integer          not null, primary key
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
#

class CustomerReport < ApplicationRecord
	has_and_belongs_to_many :reports, dependent: :destroy
	belongs_to :cost_center, optional: true
	belongs_to :customer, optional:true
	before_create :generate_token
	after_create :send_approval_email


	def generate_token

		 self.token = SecureRandom.hex(15)
		
	end

	def send_approval_email

		

		
	end
end

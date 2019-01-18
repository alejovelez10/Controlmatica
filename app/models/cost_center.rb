# == Schema Information
#
# Table name: cost_centers
#
#  id                :bigint(8)        not null, primary key
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
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#

class CostCenter < ApplicationRecord
	has_many :reports
	belongs_to :customer, optional: :true
	belongs_to :contact, optional: :true
end

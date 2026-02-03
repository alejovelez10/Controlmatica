# == Schema Information
#
# Table name: contacts
#
#  id          :bigint           not null, primary key
#  email       :string
#  name        :string
#  phone       :string
#  position    :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  customer_id :integer
#  provider_id :integer
#  user_id     :integer
#
# Indexes
#
#  index_contacts_on_customer_id  (customer_id)
#  index_contacts_on_provider_id  (provider_id)
#

class Contact < ApplicationRecord
	belongs_to :provider, inverse_of: :contacts, optional: true
	belongs_to :customer, inverse_of: :contacts, optional: true
	has_many :cost_centers
	has_many :customer_reports
	has_many :reports
end

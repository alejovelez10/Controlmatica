# == Schema Information
#
# Table name: contacts
#
#  id          :integer          not null, primary key
#  name        :string
#  email       :string
#  phone       :string
#  provider_id :integer
#  position    :string
#  user_id     :integer
#  customer_id :integer
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#

class Contact < ApplicationRecord
	belongs_to :provider, inverse_of: :contacts, optional: true
	belongs_to :customer, inverse_of: :contacts, optional: true
	has_many :cost_centers
end

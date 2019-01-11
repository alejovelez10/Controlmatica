# == Schema Information
#
# Table name: contacts
#
#  id          :bigint(8)        not null, primary key
#  name        :string
#  email       :string
#  phone       :integer
#  provider_id :integer
#  position    :string
#  user_id     :integer
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#

class Contact < ApplicationRecord
	belongs_to :provider, inverse_of: :contacts
	#belongs_to :customer, inverse_of: :contacts
end

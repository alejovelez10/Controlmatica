# == Schema Information
#
# Table name: providers
#
#  id         :bigint           not null, primary key
#  name       :string
#  phone      :string
#  address    :string
#  nit        :string
#  web        :string
#  email      :string
#  user_id    :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class Provider < ApplicationRecord
	has_many :contacts , inverse_of: :provider, dependent: :destroy
	accepts_nested_attributes_for :contacts, :allow_destroy => true
end

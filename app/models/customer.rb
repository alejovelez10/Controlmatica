# == Schema Information
#
# Table name: customers
#
#  id         :bigint(8)        not null, primary key
#  client     :string
#  name       :string
#  phone      :string
#  address    :string
#  nit        :string
#  web        :string
#  email      :string
#  user_id    :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  code       :string
#

class Customer < ApplicationRecord
	has_many :contacts , inverse_of: :customer, dependent: :destroy
	has_many :customer_reports, dependent: :destroy
	accepts_nested_attributes_for :contacts, :allow_destroy => true
end

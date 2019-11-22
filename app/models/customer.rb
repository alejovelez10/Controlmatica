# == Schema Information
#
# Table name: customers
#
#  id         :bigint           not null, primary key
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
	has_many :reports
	accepts_nested_attributes_for :contacts, :allow_destroy => true

	def self.search(search1)
		search1 != "" ? (scope :nombre, -> { where("name like '%#{search1.downcase}%' or name like '%#{search1.upcase}%' or name like '%#{search1.capitalize}%' ") }) : (scope :nombre, -> { where.not(id: nil) })
		nombre
	end
end

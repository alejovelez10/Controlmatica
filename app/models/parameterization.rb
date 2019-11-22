# == Schema Information
#
# Table name: parameterizations
#
#  id           :bigint           not null, primary key
#  name         :string
#  user_id      :integer
#  number_value :integer
#  money_value  :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class Parameterization < ApplicationRecord
    def self.search(search1)
		search1 != "" ? (scope :nombre, -> { where("name like '%#{search1.downcase}%' or name like '%#{search1.upcase}%' or name like '%#{search1.capitalize}%' ") }) : (scope :nombre, -> { where.not(id: nil) })
		nombre
	end
end

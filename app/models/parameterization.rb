# == Schema Information
#
# Table name: parameterizations
#
#  id           :bigint           not null, primary key
#  money_value  :integer
#  name         :string
#  number_value :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  user_id      :integer
#
# Indexes
#
#  index_parameterizations_on_created_at  (created_at)
#  index_parameterizations_on_name        (name)
#

class Parameterization < ApplicationRecord
    def self.search(search1)
		search1 != "" ? (scope :nombre, -> { where("name like '%#{search1.downcase}%' or name like '%#{search1.upcase}%' or name like '%#{search1.capitalize}%' ") }) : (scope :nombre, -> { where.not(id: nil) })
		nombre
	end
end

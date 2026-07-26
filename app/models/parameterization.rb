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
	scope :by_name, ->(term) { where("LOWER(name) LIKE ?", "%#{term.downcase}%") if term.present? }
	scope :ordered, -> { order(created_at: :desc) }

	def self.search(term)
		term.present? ? by_name(term) : all
	end
end

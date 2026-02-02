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
	scope :by_name, ->(term) { where("LOWER(name) LIKE ?", "%#{term.downcase}%") if term.present? }
	scope :ordered, -> { order(created_at: :desc) }

	def self.search(term)
		term.present? ? by_name(term) : all
	end
end

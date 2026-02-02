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
	has_many :contacts, inverse_of: :provider, dependent: :destroy
	has_many :materials
	accepts_nested_attributes_for :contacts, allow_destroy: true

	scope :by_name, ->(term) { where("LOWER(name) LIKE ?", "%#{term.downcase}%") if term.present? }
	scope :ordered, -> { order(created_at: :desc) }

	def self.search(term)
		term.present? ? by_name(term) : all
	end

	def self.import(file, user)
		spreadsheet = Roo::Spreadsheet.open(file.path, headers: true, encoding: "iso-8859-1:utf-8")
		header = spreadsheet.row(1)

		header[0] = "name"
		header[1] = "phone"
		header[2] = "address"
		header[3] = "nit"
		header[4] = "web"
		header[5] = "email"

		(2..spreadsheet.last_row).each do |i|
			row = Hash[[header, spreadsheet.row(i)].transpose]
			provider = find_by(id: row["id"]) || new
			provider.attributes = row.to_hash
			provider.user_id = user
			provider.save!
		end
	end
end

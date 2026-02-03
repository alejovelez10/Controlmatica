# == Schema Information
#
# Table name: providers
#
#  id         :bigint           not null, primary key
#  address    :string
#  email      :string
#  name       :string
#  nit        :string
#  phone      :string
#  web        :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :integer
#
# Indexes
#
#  index_providers_on_created_at  (created_at)
#  index_providers_on_name        (name)
#

class Provider < ApplicationRecord
	has_many :contacts , inverse_of: :provider, dependent: :destroy
	has_many :materials
	accepts_nested_attributes_for :contacts, :allow_destroy => true

	def self.search(search1)
		search1 != "" ? (scope :nombre, -> { where("name like '%#{search1.downcase}%' or name like '%#{search1.upcase}%' or name like '%#{search1.capitalize}%' ") }) : (scope :nombre, -> { where.not(id: nil) })
		nombre
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
	
	def self.open_spreadsheet(file)
		case File.extname(file.original_filename)
		when ".csv" then Roo::CSV.new(file.path, nil, :ignore)
		when ".xls" then Roo::Excel.new(file.path, nil, :ignore)
		when ".xlsx" then Roo::Excelx.new(file.path, nil, :ignore)
	else raise "Unknown file type: #{file.original_filename}"
		end
	end

end

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
	validate :validate_code

  def validate_code
    if Customer.where(code: self.code).count > 0
      errors.add(:el_prefijo, "ya existe")
    end
  end

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
		header[6] = "code"
	
		(2..spreadsheet.last_row).each do |i|
		  row = Hash[[header, spreadsheet.row(i)].transpose]

		  customer = find_by(id: row["id"]) || new
		  customer.attributes = row.to_hash
		  customer.user_id = user
		  customer.save!
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

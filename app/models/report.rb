class Report < ApplicationRecord
	has_and_belongs_to_many :customer_reports
end

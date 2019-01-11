class CustomerReport < ApplicationRecord
	has_and_belongs_to_many :reports, dependent: :destroy
end

class SalesOrder < ApplicationRecord
	belongs_to :cost_center , optional: true
end

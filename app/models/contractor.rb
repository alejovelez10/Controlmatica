# == Schema Information
#
# Table name: contractors
#
#  id             :bigint           not null, primary key
#  sales_number   :string
#  sales_date     :date
#  ammount        :float
#  cost_center_id :integer
#  user_id        :integer
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#

class Contractor < ApplicationRecord
    belongs_to :cost_center
end

# == Schema Information
#
# Table name: parameterizations
#
#  id           :integer          not null, primary key
#  name         :string
#  user_id      :integer
#  number_value :integer
#  money_value  :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class Parameterization < ApplicationRecord
end

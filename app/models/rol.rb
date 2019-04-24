# == Schema Information
#
# Table name: rols
#
#  id          :integer          not null, primary key
#  name        :string
#  description :text
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#

class Rol < ApplicationRecord
	has_one :user
end

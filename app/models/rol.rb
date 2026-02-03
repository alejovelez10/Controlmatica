# == Schema Information
#
# Table name: rols
#
#  id          :bigint           not null, primary key
#  description :text
#  name        :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  user_id     :integer
#
# Indexes
#
#  index_rols_on_name  (name)
#

class Rol < ApplicationRecord
	has_one :user
	has_and_belongs_to_many :accion_modules
end

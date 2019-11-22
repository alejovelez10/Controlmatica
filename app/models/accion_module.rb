# == Schema Information
#
# Table name: accion_modules
#
#  id                :bigint           not null, primary key
#  name              :string
#  description       :text
#  user_id           :integer
#  module_control_id :integer
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#

class AccionModule < ApplicationRecord
  belongs_to :module_control
  has_and_belongs_to_many :rols
  belongs_to :user
end

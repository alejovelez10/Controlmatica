# == Schema Information
#
# Table name: accion_modules
#
#  id                :bigint           not null, primary key
#  description       :text
#  name              :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  module_control_id :integer
#  user_id           :integer
#
# Indexes
#
#  index_accion_modules_on_module_control_id  (module_control_id)
#  index_accion_modules_on_name               (name)
#

class AccionModule < ApplicationRecord
  belongs_to :module_control
  has_and_belongs_to_many :rols
  belongs_to :user
end

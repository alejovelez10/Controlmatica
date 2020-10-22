# == Schema Information
#
# Table name: module_controls
#
#  id          :bigint           not null, primary key
#  name        :string
#  description :text
#  user_id     :integer
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#

class ModuleControl < ApplicationRecord
  has_many :accion_modules, dependent: :destroy
  belongs_to :user, optional: true
end

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

require 'test_helper'

class AccionModuleTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

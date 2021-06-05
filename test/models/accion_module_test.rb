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

require 'test_helper'

class AccionModuleTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

# == Schema Information
#
# Table name: module_controls
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
#  index_module_controls_on_name  (name)
#

require 'test_helper'

class ModuleControlTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

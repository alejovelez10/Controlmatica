# == Schema Information
#
# Table name: register_edits
#
#  id               :bigint           not null, primary key
#  date_update      :date
#  description      :text
#  editValues       :json
#  module           :string
#  newValues        :json
#  state            :string
#  type_edit        :string           default("edito")
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  register_user_id :integer
#  user_id          :integer
#

require 'test_helper'

class RegisterEditTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

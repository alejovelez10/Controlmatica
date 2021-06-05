# == Schema Information
#
# Table name: register_edits
#
#  id               :bigint           not null, primary key
#  user_id          :integer
#  register_user_id :integer
#  state            :string
#  date_update      :date
#  editValues       :json
#  newValues        :json
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  module           :string
#  description      :text
#

require 'test_helper'

class RegisterEditTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

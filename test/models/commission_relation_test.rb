# == Schema Information
#
# Table name: commission_relations
#
#  id                  :bigint           not null, primary key
#  area                :string
#  creation_date       :date
#  end_date            :date
#  observations        :text
#  start_date          :date
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  last_user_edited_id :integer
#  user_direction_id   :integer
#  user_id             :integer
#  user_report_id      :integer
#
require 'test_helper'

class CommissionRelationTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

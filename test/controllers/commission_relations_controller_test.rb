require 'test_helper'

class CommissionRelationsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get commission_relations_index_url
    assert_response :success
  end

end

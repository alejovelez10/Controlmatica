require 'test_helper'

class CommissionsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get commissions_index_url
    assert_response :success
  end

end

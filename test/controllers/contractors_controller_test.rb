require 'test_helper'

class ContractorsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get contractors_index_url
    assert_response :success
  end

end

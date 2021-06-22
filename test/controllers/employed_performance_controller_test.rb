require 'test_helper'

class EmployedPerformanceControllerTest < ActionDispatch::IntegrationTest
  test "should get show" do
    get employed_performance_show_url
    assert_response :success
  end

end

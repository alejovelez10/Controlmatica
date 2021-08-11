require 'test_helper'

class ReportExpenseOptionsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get report_expense_options_index_url
    assert_response :success
  end

end

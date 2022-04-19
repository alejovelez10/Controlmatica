# == Schema Information
#
# Table name: sales_orders
#
#  id                  :bigint           not null, primary key
#  created_date        :date
#  description         :text
#  order_file          :string
#  order_number        :string
#  order_value         :float
#  state               :string
#  sum_invoices        :float
#  update_user         :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  cost_center_id      :integer
#  last_user_edited_id :integer
#  user_id             :integer
#

require 'test_helper'

class SalesOrderTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

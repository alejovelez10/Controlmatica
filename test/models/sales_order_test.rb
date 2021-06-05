# == Schema Information
#
# Table name: sales_orders
#
#  id             :bigint           not null, primary key
#  created_date   :date
#  order_number   :string
#  order_value    :float
#  state          :string
#  order_file     :string
#  cost_center_id :integer
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  user_id        :integer
#  description    :text
#  sum_invoices   :float
#  update_user    :integer
#

require 'test_helper'

class SalesOrderTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

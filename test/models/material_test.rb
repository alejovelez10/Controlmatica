# == Schema Information
#
# Table name: materials
#
#  id                      :bigint           not null, primary key
#  amount                  :float
#  delivery_date           :date
#  description             :text
#  provider_invoice_number :string
#  provider_invoice_value  :float
#  sales_date              :date
#  sales_number            :string
#  sales_state             :string
#  update_user             :integer
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  cost_center_id          :integer
#  last_user_edited_id     :integer
#  provider_id             :integer
#  user_id                 :integer
#
# Indexes
#
#  index_materials_on_cost_center_id  (cost_center_id)
#

require 'test_helper'

class MaterialTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

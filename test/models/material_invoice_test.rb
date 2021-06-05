# == Schema Information
#
# Table name: material_invoices
#
#  id          :bigint           not null, primary key
#  material_id :integer
#  user_id     :integer
#  number      :string
#  value       :float
#  observation :text
#  file        :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#

require 'test_helper'

class MaterialInvoiceTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

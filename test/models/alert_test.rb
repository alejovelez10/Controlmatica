# == Schema Information
#
# Table name: alerts
#
#  id                :bigint           not null, primary key
#  name              :string
#  ing_ejecucion_min :integer
#  ing_ejecucion_med :integer
#  ing_ejecucion_max :integer
#  ing_costo_min     :integer
#  ing_costo_med     :integer
#  ing_costo_max     :integer
#  tab_ejecucion_min :integer
#  tab_ejecucion_med :integer
#  tab_ejecucion_max :integer
#  tab_costo_min     :integer
#  tab_costo_med     :integer
#  tab_costo_max     :integer
#  desp_min          :integer
#  desp_med          :integer
#  desp_max          :integer
#  mat_min           :integer
#  mat_med           :integer
#  mat_max           :integer
#  via_min           :integer
#  via_med           :integer
#  via_max           :integer
#  total_min         :integer
#  total_med         :integer
#  tatal_max         :integer
#  user_id           :integer
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#

require 'test_helper'

class AlertTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end

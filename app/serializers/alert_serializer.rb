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

class AlertSerializer < ActiveModel::Serializer
  attributes :id, :name, :ing_ejecucion_min, :ing_ejecucion_med, :ing_ejecucion_max, :ing_costo_min, :ing_costo_med, :ing_costo_max, :tab_ejecucion_min, :tab_ejecucion_med, :tab_ejecucion_max, :tab_costo_min, :tab_costo_med, :tab_costo_max, :desp_min, :desp_med, :desp_max, :mat_min, :mat_med, :mat_max, :via_min, :via_med, :via_max, :total_min, :total_med, :tatal_max
end

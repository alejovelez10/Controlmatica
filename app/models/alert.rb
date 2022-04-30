# == Schema Information
#
# Table name: alerts
#
#  id                   :bigint           not null, primary key
#  alert_hour_max       :integer          default(100)
#  alert_hour_med       :integer          default(100)
#  alert_hour_min       :integer          default(100)
#  alert_max            :integer          default(151)
#  alert_med            :integer          default(150)
#  alert_min            :integer          default(100)
#  color_hour_max       :string           default("#24bc6b")
#  color_hour_med       :string           default("#d4b21e")
#  color_hour_min       :string           default("#d26666")
#  color_max            :string           default("#24bc6b")
#  color_mid            :string           default("#d4b21e")
#  color_min            :string           default("#d26666")
#  commision_porcentaje :float
#  desp_max             :integer
#  desp_med             :integer
#  desp_min             :integer
#  ing_costo_max        :integer
#  ing_costo_med        :integer
#  ing_costo_min        :integer
#  ing_ejecucion_max    :integer
#  ing_ejecucion_med    :integer
#  ing_ejecucion_min    :integer
#  mat_max              :integer
#  mat_med              :integer
#  mat_min              :integer
#  name                 :string
#  tab_costo_max        :integer
#  tab_costo_med        :integer
#  tab_costo_min        :integer
#  tab_ejecucion_max    :integer
#  tab_ejecucion_med    :integer
#  tab_ejecucion_min    :integer
#  tatal_max            :integer
#  total_med            :integer
#  total_min            :integer
#  via_max              :integer
#  via_med              :integer
#  via_min              :integer
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  user_id              :integer
#

class Alert < ApplicationRecord
end

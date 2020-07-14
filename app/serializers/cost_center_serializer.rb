# == Schema Information
#
# Table name: cost_centers
#
#  id                        :bigint           not null, primary key
#  customer_id               :integer
#  contact_id                :integer
#  description               :text
#  start_date                :date
#  end_date                  :date
#  quotation_number          :string
#  engineering_value         :float
#  viatic_value              :float
#  execution_state           :string
#  invoiced_state            :string
#  service_type              :string
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  count                     :integer
#  code                      :string
#  create_type               :boolean
#  eng_hours                 :float
#  hour_cotizada             :float
#  hour_real                 :float
#  quotation_value           :float
#  work_force_contractor     :float
#  hours_contractor          :float
#  hours_contractor_invoices :float
#  hours_contractor_real     :float
#  materials_value           :float
#  user_id                   :integer
#  sum_materials             :string
#  sum_contractors           :string
#  sum_executed              :string
#  sum_viatic                :float
#  ingenieria_total_costo    :float            default(0.0)
#  sum_materials_costo       :float            default(0.0)
#  sum_materials_cot         :float            default(0.0)
#  contractor_total_costo    :float            default(0.0)
#  sum_contractor_costo      :float            default(0.0)
#  sum_contractor_cot        :float            default(0.0)
#  sum_materials_value       :float            default(0.0)
#  displacement_hours        :float
#  value_displacement_hours  :float
#  offset_value              :float
#  update_user               :integer
#  ing_horas_eje             :float            default(0.0)
#  ing_horas_porcentaje      :float            default(0.0)
#  ing_costo_cotizado        :float            default(0.0)
#  ing_costo_real            :float            default(0.0)
#  ing_costo_porcentaje      :float            default(0.0)
#  cont_horas_eje            :float            default(0.0)
#  cont_horas_porcentaje     :float            default(0.0)
#  cont_costo_cotizado       :float            default(0.0)
#  cont_costo_real           :float            default(0.0)
#  cont_costo_porcentaje     :float            default(0.0)
#  mat_costo_real            :float            default(0.0)
#  mat_costo_porcentaje      :float            default(0.0)
#  viat_costo_real           :float            default(0.0)
#  viat_costo_porcentaje     :float            default(0.0)
#  fact_real                 :float            default(0.0)
#  fact_porcentaje           :float            default(0.0)
#  desp_horas_eje            :float            default(0.0)
#  desp_horas_porcentaje     :float            default(0.0)
#

class CostCenterSerializer < ActiveModel::Serializer
  attributes :id, :code, :description
end

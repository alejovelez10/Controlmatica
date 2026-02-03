# == Schema Information
#
# Table name: cost_centers
#
#  id                        :bigint           not null, primary key
#  aiu                       :float            default(0.0)
#  aiu_percent               :float            default(0.0)
#  aiu_percent_real          :float            default(0.0)
#  aiu_real                  :float            default(0.0)
#  code                      :string
#  cont_costo_cotizado       :float            default(0.0)
#  cont_costo_porcentaje     :float            default(0.0)
#  cont_costo_real           :float            default(0.0)
#  cont_horas_eje            :float            default(0.0)
#  cont_horas_porcentaje     :float            default(0.0)
#  contractor_total_costo    :float            default(0.0)
#  count                     :integer
#  create_type               :boolean
#  description               :text
#  desp_horas_eje            :float            default(0.0)
#  desp_horas_porcentaje     :float            default(0.0)
#  displacement_hours        :float
#  end_date                  :date
#  eng_hours                 :float
#  engineering_value         :float
#  execution_state           :string
#  fact_porcentaje           :float            default(0.0)
#  fact_real                 :float            default(0.0)
#  has_many_quotes           :boolean          default(FALSE)
#  hour_cotizada             :float
#  hour_real                 :float
#  hours_contractor          :float
#  hours_contractor_invoices :float
#  hours_contractor_real     :float
#  ing_costo_cotizado        :float            default(0.0)
#  ing_costo_porcentaje      :float            default(0.0)
#  ing_costo_real            :float            default(0.0)
#  ing_horas_eje             :float            default(0.0)
#  ing_horas_porcentaje      :float            default(0.0)
#  ingenieria_total_costo    :float            default(0.0)
#  invoiced_state            :string
#  mat_costo_porcentaje      :float            default(0.0)
#  mat_costo_real            :float            default(0.0)
#  materials_value           :float
#  offset_value              :float
#  quotation_number          :string
#  quotation_value           :float
#  sales_state               :string           default("SIN COMPRAS")
#  service_type              :string
#  start_date                :date
#  sum_contractor_costo      :float            default(0.0)
#  sum_contractor_cot        :float            default(0.0)
#  sum_contractors           :string
#  sum_executed              :string
#  sum_materials             :string
#  sum_materials_costo       :float            default(0.0)
#  sum_materials_cot         :float            default(0.0)
#  sum_materials_value       :float            default(0.0)
#  sum_viatic                :float
#  total_expenses            :float            default(0.0)
#  update_user               :integer
#  value_displacement_hours  :float
#  viat_costo_porcentaje     :float            default(0.0)
#  viat_costo_real           :float            default(0.0)
#  viatic_value              :float
#  work_force_contractor     :float
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  contact_id                :integer
#  customer_id               :integer
#  last_user_edited_id       :integer
#  user_id                   :integer
#  user_owner_id             :integer
#
# Indexes
#
#  index_cost_centers_on_contact_id           (contact_id)
#  index_cost_centers_on_created_at           (created_at)
#  index_cost_centers_on_customer_id          (customer_id)
#  index_cost_centers_on_execution_state      (execution_state)
#  index_cost_centers_on_invoiced_state       (invoiced_state)
#  index_cost_centers_on_last_user_edited_id  (last_user_edited_id)
#  index_cost_centers_on_service_type         (service_type)
#  index_cost_centers_on_start_date           (start_date)
#  index_cost_centers_on_user_id              (user_id)
#  index_cost_centers_on_user_owner_id        (user_owner_id)
#

class CostCenterSerializer < ActiveModel::Serializer
  attributes :id, :code, :description, :aiu_percent_real, :start_date, :quotation_value, :execution_state
end

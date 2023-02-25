# == Schema Information
#
# Table name: quotations
#
#  id                        :bigint           not null, primary key
#  contractor_total_costo    :float
#  description               :text
#  displacement_hours        :float
#  eng_hours                 :float
#  engineering_value         :float
#  hour_cotizada             :float
#  hour_real                 :float
#  hours_contractor          :float
#  hours_contractor_invoices :float
#  hours_contractor_real     :float
#  ingenieria_total_costo    :float
#  materials_value           :float
#  offset_value              :float
#  quotation_number          :string
#  quotation_value           :float
#  value_displacement_hours  :float
#  viatic_value              :float
#  work_force_contractor     :float
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  cost_center_id            :integer
#
class QuotationSerializer < ActiveModel::Serializer
  attributes :id, :description, :quotation_number, :eng_hours, :hour_real, :hour_cotizada, :hours_contractor, :hours_contractor_real, :hours_contractor_invoices, :displacement_hours, :value_displacement_hours, :materials_value, :viatic_value, :quotation_value, :ingenieria_total_costo, :engineering_value, :contractor_total_costo,:work_force_contractor,:offset_value
end
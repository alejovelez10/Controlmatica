# == Schema Information
#
# Table name: quotations
#
#  id                        :bigint           not null, primary key
#  description               :text
#  displacement_hours        :float
#  eng_hours                 :float
#  hour_cotizada             :float
#  hour_real                 :float
#  hours_contractor          :float
#  hours_contractor_invoices :float
#  hours_contractor_real     :float
#  materials_value           :float
#  quotation_number          :float
#  quotation_value           :float
#  value_displacement_hours  :float
#  viatic_value              :float
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  cost_center_id            :integer
#
class QuotationSerializer < ActiveModel::Serializer
  attributes :id, :description, :quotation_number, :eng_hours, :hour_real, :hour_cotizada, :hours_contractor, :hours_contractor_real, :hours_contractor_invoices, :displacement_hours, :value_displacement_hours, :materials_value, :viatic_value, :quotation_value
end

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
#  quotation_number          :string
#  quotation_value           :float
#  value_displacement_hours  :float
#  viatic_value              :float
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  cost_center_id            :integer
#
class Quotation < ApplicationRecord
    belongs_to :cost_center
    before_save :calculate_costo

    def calculate_costo
        self.ingenieria_total_costo = self.eng_hours * self.hour_real
        self.engineering_value = self.eng_hours * self.hour_cotizada
        self.contractor_total_costo = self.hours_contractor * self.hours_contractor_real
        self.work_force_contractor = self.hours_contractor * self.hours_contractor_invoices
    
        if self.displacement_hours.present? || self.value_displacement_hours.present?
          valor = self.displacement_hours * self.hour_real
          self.offset_value = valor
        end
      end
end
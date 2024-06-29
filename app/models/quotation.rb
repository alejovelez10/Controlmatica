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
class Quotation < ApplicationRecord
    belongs_to :cost_center
    before_save :calculate_costo
    after_save :calculate_costo_cc
    after_destroy :calculate_costo_cc

    def calculate_costo

        self.eng_hours = !self.eng_hours.nil? ?  self.eng_hours : 0
        self.hour_real = !self.hour_real.nil? ?  self.hour_real : 0
        self.hours_contractor = !self.hours_contractor.nil? ?  self.hours_contractor : 0
        self.hours_contractor_real = !self.hours_contractor_real.nil? ?  self.hours_contractor_real : 0
        self.value_displacement_hours = !self.value_displacement_hours.nil? ?  self.value_displacement_hours : 0
        self.hours_contractor_invoices = !self.hours_contractor_invoices.nil? ?  self.hours_contractor_invoices : 0
        self.displacement_hours = !self.displacement_hours.nil? ?  self.displacement_hours : 0

        self.ingenieria_total_costo = self.eng_hours * self.hour_real
        self.engineering_value = self.eng_hours * self.hour_cotizada
        self.contractor_total_costo = self.hours_contractor * self.hours_contractor_real
        self.work_force_contractor = self.hours_contractor * self.hours_contractor_invoices
        if self.value_displacement_hours.present? || self.displacement_hours.present?
          valor = self.displacement_hours * self.value_displacement_hours
          self.offset_value = valor
        end
    end

      def calculate_costo_cc

        cost_center = self.cost_center
        cost_center.displacement_hours = cost_center.quotations.sum(:displacement_hours)
        cost_center.eng_hours = cost_center.quotations.sum(:eng_hours)
        cost_center.engineering_value = cost_center.quotations.sum(:engineering_value)
        cost_center.hour_cotizada = self.hour_cotizada
        cost_center.hour_real = self.hour_real
        cost_center.hours_contractor_real = self.hours_contractor_real
        cost_center.hours_contractor_invoices = self.hours_contractor_invoices
        cost_center.hours_contractor = cost_center.quotations.sum(:hours_contractor)
        cost_center.ingenieria_total_costo = cost_center.quotations.sum(:ingenieria_total_costo)
        cost_center.materials_value = cost_center.quotations.sum(:materials_value)
        cost_center.quotation_value = cost_center.quotations.sum(:quotation_value)
        cost_center.value_displacement_hours = self.value_displacement_hours
        cost_center.viatic_value = cost_center.quotations.sum(:viatic_value)
        cost_center.work_force_contractor = cost_center.quotations.sum(:work_force_contractor)
        cost_center.contractor_total_costo = cost_center.quotations.sum(:contractor_total_costo)
        cost_center.offset_value = cost_center.quotations.sum(:offset_value)
        cost_center.save

      end
end

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

class MaterialInvoice < ApplicationRecord
    belongs_to :material
    after_create :update_values
    
    def update_values
        material = Material.find(self.material_id) 
        puts "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        puts material.material_invoices.sum(:value)
        material.update(provider_invoice_value: material.material_invoices.sum(:value))

        if self.value > material.amount
          puts "111111111111111"
          material.update(sales_state: "INGRESADO CON MAYOR VALOR EN FACTURA")
        elsif self.value < material.amount && self.value > 0
          puts "33333333"
          material.update(sales_state: "INGRESADO PARCIAL")
        elsif self.value == 0 || self.value.nil?
          puts "222222"
          material.update(sales_state: "PROCESADO")
        elsif self.value == 0 || self.value == material.amount
          puts "222222"
          material.update(sales_state: "INGRESADO TOTAL")
        end
    end
end

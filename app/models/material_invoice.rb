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
  after_save :update_values

  def update_values
    material = Material.find(self.material_id)
    puts "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    invoice_total = material.material_invoices.sum(:value)
    material.update(provider_invoice_value: invoice_total)
  end
end

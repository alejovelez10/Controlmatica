# == Schema Information
#
# Table name: materials
#
#  id                      :bigint           not null, primary key
#  provider_id             :integer
#  sales_date              :date
#  sales_number            :string
#  amount                  :float
#  delivery_date           :date
#  sales_state             :string
#  description             :text
#  provider_invoice_number :string
#  provider_invoice_value  :float
#  cost_center_id          :integer
#  user_id                 :integer
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  update_user             :integer
#  last_user_edited_id     :integer
#

class MaterialSerializer < ActiveModel::Serializer
  attributes :id, :amount, :sales_date

  def material_invoices
    object.material_invoices # or whatever methood
  end
end

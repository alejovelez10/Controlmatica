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
  attributes :id, :amount, :cost_center, :cost_center_id, :created_at, :delivery_date, :description, :last_user_edited, :last_user_edited_id, :material_invoices, :sum_material_invoices, :provider, :provider_id, :provider_invoice_number, :provider_invoice_value, :sales_date, :sales_number, :sales_state, :update_user, :updated_at, :user, :user_id

  def material_invoices
    object.material_invoices.collect do |material_invoice|
      {
        :id => material_invoice.id,
        :number => material_invoice.number,
        :value => material_invoice.value,
        :observation => material_invoice.observation,
      }
    end
  end

  def cost_center
    {
      code: object.cost_center.code,
      sales_state: object.cost_center.sales_state
    }
  end

  def last_user_edited
    {
      id: object.last_user_edited ? object.last_user_edited.id : "",
      names: object.last_user_edited ? object.last_user_edited.names : "",
    }
  end

  def user
    {
      id: object.user.id,
      names: object.user.names
    }
  end

  def provider
    {
      id: object.provider.id,
      name: object.provider.name,
    }
  end

  def sum_material_invoices
    object.material_invoices.sum(:value)
  end
end

# == Schema Information
#
# Table name: report_expenses
#
#  id                     :bigint           not null, primary key
#  description            :text
#  identification         :string
#  invoice_date           :date
#  invoice_name           :string
#  invoice_number         :string
#  invoice_tax            :float            default(0.0)
#  invoice_total          :float            default(0.0)
#  invoice_type           :string
#  invoice_value          :float            default(0.0)
#  is_acepted             :boolean          default(FALSE)
#  payment_type           :string
#  type_identification    :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  cost_center_id         :integer
#  last_user_edited_id    :integer
#  payment_type_id        :integer
#  type_identification_id :integer
#  user_id                :integer
#  user_invoice_id        :integer
#
# Indexes
#
#  index_report_expenses_on_cost_center_id  (cost_center_id)
#

class ReportExpenseSerializer < ActiveModel::Serializer
  attributes :id, :invoice_name, :invoice_date, :identification, :description, :invoice_number, :invoice_type, :payment_type, :invoice_value, :invoice_tax, :invoice_total, :cost_center_id, :user_invoice_id, :user_invoice, :type_identification_id, :payment_type_id, :updated_at, :is_acepted, :created_at
  belongs_to :cost_center, serializer: CostCenterSerializer

  belongs_to :type_identification, serializer: ReportExpenseOptionSerializer
  belongs_to :payment_type, serializer: ReportExpenseOptionSerializer
  belongs_to :last_user_edited, serializer: UserSerializer
  belongs_to :user, serializer: UserSerializer
  
  def user_invoice
    return nil unless object.user_invoice.present?
    {
      id: object.user_invoice.id,
      name: object.user_invoice.names
    }
  end
  
end

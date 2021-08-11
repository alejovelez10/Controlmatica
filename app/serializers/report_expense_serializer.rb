# == Schema Information
#
# Table name: report_expenses
#
#  id                     :bigint           not null, primary key
#  user_id                :integer
#  cost_center_id         :integer
#  user_invoice_id        :integer
#  invoice_name           :string
#  invoice_date           :date
#  type_identification    :string
#  description            :text
#  invoice_number         :string
#  invoice_type           :string
#  payment_type           :string
#  invoice_value          :float            default(0.0)
#  invoice_tax            :float            default(0.0)
#  invoice_total          :float            default(0.0)
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  type_identification_id :integer
#  payment_type_id        :integer
#  identification         :string
#

class ReportExpenseSerializer < ActiveModel::Serializer
  attributes :id, :invoice_name, :invoice_date, :identification, :description, :invoice_number, :invoice_type, :payment_type, :invoice_value, :invoice_tax, :invoice_total, :cost_center_id, :user_invoice_id, :user_invoice, :type_identification_id, :payment_type_id
  belongs_to :cost_center, serializer: CostCenterSerializer

  belongs_to :type_identification, serializer: ReportExpenseOptionSerializer
  belongs_to :payment_type, serializer: ReportExpenseOptionSerializer
  
  def user_invoice
    {
      id: object.user_invoice.id,
      name: object.user_invoice.names
    }
  end
  
end

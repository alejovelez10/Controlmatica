# == Schema Information
#
# Table name: commissions
#
#  id                  :bigint           not null, primary key
#  end_date            :date
#  hours_worked        :float
#  is_acepted          :boolean          default(FALSE)
#  observation         :text
#  start_date          :date
#  total_value         :float
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  cost_center_id      :integer
#  customer_invoice_id :integer
#  customer_report_id  :integer
#  last_user_edited_id :integer
#  user_id             :integer
#  user_invoice_id     :integer
#
class CommissionSerializer < ActiveModel::Serializer
  attributes :id, :created_at, :updated_at, :is_acepted, :last_user_edited, :user, :user_invoice, :total_value, :user_invoice_id, :start_date, :end_date, :customer_invoice_id, :observation, :hours_worked, :total_value, :customer_invoice, :customer_report, :cost_center

  def last_user_edited
    if object.last_user_edited.present?
      {
        id: object.last_user_edited.id,
        names: object.last_user_edited.names
      }
    end
  end

  def customer_invoice
    {
      id: object.customer_invoice.id,
      number_invoice: object.customer_invoice.number_invoice
    }
  end

  def user
    {
      id: object.user.id,
      names: object.user.names
    }
  end

  def user_invoice
    {
      id: object.user_invoice.id,
      names: object.user_invoice.names
    }
  end

  def customer_report
    if object.customer_report.present?
      {
        id: object.customer_report.id,
        description: object.customer_report.description
      }
    end
  end

  def cost_center
    if object.cost_center.present?
      {
        id: object.cost_center.id,
        code: object.cost_center.code
      }
    end
  end
  
end

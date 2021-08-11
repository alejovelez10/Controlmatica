# == Schema Information
#
# Table name: report_expense_options
#
#  id         :bigint           not null, primary key
#  name       :string
#  category   :string
#  user_id    :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class ReportExpenseOptionSerializer < ActiveModel::Serializer
  attributes :id, :name, :category
end

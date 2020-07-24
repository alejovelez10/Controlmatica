# == Schema Information
#
# Table name: contractors
#
#  id              :bigint           not null, primary key
#  sales_number    :string
#  sales_date      :date
#  ammount         :float
#  cost_center_id  :integer
#  user_id         :integer
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  description     :text
#  hours           :float
#  user_execute_id :integer
#  update_user     :integer
#

class ContractorSerializer < ActiveModel::Serializer
  attributes :id, :ammount, :sales_date
end

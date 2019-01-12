# == Schema Information
#
# Table name: customer_reports
#
#  id           :bigint(8)        not null, primary key
#  report_date  :date
#  description  :text
#  token        :string
#  report_state :string
#  report_code  :string
#  customer_id  :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  user_id      :integer
#

class CustomerReport < ApplicationRecord
	has_and_belongs_to_many :reports, dependent: :destroy
end

# == Schema Information
#
# Table name: customers
#
#  id         :bigint(8)        not null, primary key
#  client     :string
#  name       :string
#  phone      :integer
#  address    :string
#  nit        :integer
#  web        :string
#  email      :string
#  user_id    :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class Customer < ApplicationRecord
end

# == Schema Information
#
# Table name: users
#
#  id                     :bigint           not null, primary key
#  actual_user            :integer
#  avatar                 :string
#  birthday               :date
#  current_sign_in_at     :datetime
#  current_sign_in_ip     :string
#  document_type          :string
#  email                  :string           default(""), not null
#  encrypted_password     :string           default(""), not null
#  last_names             :string
#  last_sign_in_at        :datetime
#  last_sign_in_ip        :string
#  menu                   :string           default("nav-sm")
#  names                  :string
#  number_document        :integer
#  remember_created_at    :datetime
#  reset_password_sent_at :datetime
#  reset_password_token   :string
#  rol_user               :string
#  sign_in_count          :integer          default(0), not null
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  rol_id                 :integer
#
# Indexes
#
#  index_users_on_email                 (email) UNIQUE
#  index_users_on_reset_password_token  (reset_password_token) UNIQUE
#

class UserSerializer < ActiveModel::Serializer
  attributes :id, :names
end

# == Schema Information
#
# Table name: users
#
#  id                     :bigint           not null, primary key
#  email                  :string           default(""), not null
#  encrypted_password     :string           default(""), not null
#  reset_password_token   :string
#  reset_password_sent_at :datetime
#  remember_created_at    :datetime
#  sign_in_count          :integer          default(0), not null
#  current_sign_in_at     :datetime
#  last_sign_in_at        :datetime
#  current_sign_in_ip     :string
#  last_sign_in_ip        :string
#  names                  :string
#  last_names             :string
#  birthday               :date
#  avatar                 :string
#  rol_id                 :integer
#  document_type          :string
#  number_document        :integer
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  rol_user               :string
#  menu                   :string           default("nav-sm")
#

class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  has_many :customer_reports
  has_many :reports
  has_many :accion_modules
  has_many :module_controls

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  mount_uploader :avatar, AvatarUploader
  belongs_to :rol, optional: true
end

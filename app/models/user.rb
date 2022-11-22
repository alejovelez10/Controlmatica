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

class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  has_many :customer_reports
  has_many :reports
  has_many :accion_modules
  has_many :module_controls
  has_many :cost_centers
  has_many :register_edits
  has_many :notification_alerts

  has_many :contractors, dependent: :destroy
  has_many :cost_centers, dependent: :destroy
  has_many :customer_reports, dependent: :destroy
  has_many :expense_ratios, dependent: :destroy
  has_many :shifts, dependent: :destroy
  has_many :materials, dependent: :destroy
  has_many :report_expenses, dependent: :destroy
  has_many :reports, dependent: :destroy
  has_many :sales_orders, dependent: :destroy
  
  before_update :create_edit_register

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  #mount_uploader :avatar, AvatarUploader  
  belongs_to :rol, optional: true

  def self.current
    Thread.current[:user]
  end

  def self.current=(user)
    Thread.current[:user] = user
  end

 

  def create_edit_register    
    unless self.menu_changed? || self.encrypted_password_changed?

      if self.rol_id_changed?
        names = []
        find_rols = Rol.where(id: self.rol_id_change)
        find_rols.each do |rol| 
          names << rol.name
        end
        rol_user = "<p>El Rol: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"#self.customer.name
      else
        rol_user = ""
      end

      names = self.names_changed? == true ? ("<p>El nombre: <b class='color-true'>#{self.names_change[0]}</b> / <b class='color-false'>#{self.names_change[1]}</b></p>") : "" 
      email = self.email_changed? == true ? ("<p>EL email: <b class='color-true'>#{self.email_change[0]}</b> / <b class='color-false'>#{self.email_change[1]}</b></p>") : "" 
      document_type = self.document_type_changed? == true ? ("<p>El tipo de documento: <b class='color-true'>#{self.document_type_change[0]}</b> / <b class='color-false'>#{self.document_type_change[1]}</b></p>") : "" 
      number_document = self.number_document_changed? == true ? ("<p>El numero de documento: <b class='color-true'>#{self.number_document_change[0]}</b> / <b class='color-false'>#{self.number_document_change[1]}</b></p>") : "" 
      
      str = "#{rol_user}#{names}#{email}#{document_type}#{number_document}"
  
      RegisterEdit.create(  
        user_id: User.current.id, 
        register_user_id: self.id, 
        state: "pending", 
        date_update: Time.now,
        module: "Usuarios",
        description: str
      )
    end

  end

end

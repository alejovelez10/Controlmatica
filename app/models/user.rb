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
#  phone                  :string
#  phone_normalized       :string
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
#  index_users_on_phone_normalized      (phone_normalized)
#  index_users_on_reset_password_token  (reset_password_token) UNIQUE
#  index_users_on_rol_id                (rol_id)
#

class User < ApplicationRecord
  # Minimo de digitos para considerar que un telefono es un telefono y no basura
  # (un fijo colombiano sin indicativo tiene 7).
  PHONE_MIN_DIGITS = 7
  # Longitud de la llave de busqueda: los ultimos 10 digitos absorben el
  # indicativo (+57) y los prefijos que anteponen los gateways (whatsapp:).
  PHONE_KEY_LENGTH = 10

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
  # before_save y NO before_validation: User ya tiene before_update
  # :create_edit_register y no conviene meterse en el orden de validaciones de
  # Devise.
  before_save :set_phone_normalized

  # Busqueda del usuario por la llave normalizada del telefono (la usa el
  # agente de WhatsApp para saber quien reporta).
  scope :by_normalized_phone, ->(key) { where(phone_normalized: key) }

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  mount_uploader :avatar, AvatarUploader
  belongs_to :rol, optional: true
  has_and_belongs_to_many :shifts

  def self.current
    Thread.current[:user]
  end

  def self.current=(user)
    Thread.current[:user] = user
  end

  # Deja el telefono en una llave comparable de hasta 10 digitos.
  # "+57 (300) 123-4567" -> "3001234567" ; "300 12" -> nil
  def self.normalize_phone(raw)
    digits = raw.to_s.gsub(/\D/, "")
    return nil if digits.length < PHONE_MIN_DIGITS

    digits.length > PHONE_KEY_LENGTH ? digits.last(PHONE_KEY_LENGTH) : digits
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

  private

  # Mantiene phone_normalized sincronizado con phone. La segunda condicion
  # rellena los registros viejos que todavia no tienen la llave calculada.
  def set_phone_normalized
    return unless will_save_change_to_phone? || phone_normalized.blank?

    self.phone_normalized = self.class.normalize_phone(phone)
  end

end

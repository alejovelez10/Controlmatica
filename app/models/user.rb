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
#  actual_user            :integer
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
  
  #before_update :create_edit_register

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  mount_uploader :avatar, AvatarUploader  
  belongs_to :rol, optional: true

=begin
  def create_edit_register    
    unless self.menu_changed?

      if self.rol_id_changed?
        names = []
        find_rols = Rol.where(id: self.rol_id_change)
        find_rols.each do |rol| 
          names << rol.name
        end
        name_user = "<p>El Rol: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"#self.customer.name
      else
        name_user = ""
      end

      sales_date = self.sales_date_changed? == true ? ("<p>La Fecha de orden: <b class='color-true'>#{self.sales_date_change[0]}</b> / <b class='color-false'>#{self.sales_date_change[1]}</b></p>") : "" 
      sales_number = self.sales_number_changed? == true ? ("<p>EL Numero de orden: <b class='color-true'>#{self.sales_number_change[0]}</b> / <b class='color-false'>#{self.sales_number_change[1]}</b></p>") : "" 
      amount = self.amount_changed? == true ? ("<p>El Valor: <b class='color-true'>#{self.amount_change[0]}</b> / <b class='color-false'>#{self.amount_change[1]}</b></p>") : "" 
      delivery_date = self.delivery_date_changed? == true ? ("<p>La Fecha estimada de entrega: <b class='color-true'>#{self.delivery_date_change[0]}</b> / <b class='color-false'>#{self.delivery_date_change[1]}</b></p>") : "" 
      description = self.description_changed? == true ? ("<p>La Descripcion: <b class='color-true'>#{self.description_change[0]}</b> / <b class='color-false'>#{self.description_change[1]}</b></p>") : "" 
      
      str = "#{provider}#{centro}#{sales_date}#{sales_number}#{amount}#{delivery_date}#{description}"
  
      RegisterEdit.create(  
        user_id: 12, 
        register_user_id: self.id, 
        state: "pending", 
        date_update: Time.now,
        module: "Usuarios",
        description: str
      )
    end

  end
=end

end

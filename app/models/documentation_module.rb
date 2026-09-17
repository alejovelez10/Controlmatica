# == Schema Information
#
# Table name: documentation_modules
#
#  id          :bigint           not null, primary key
#  description :text
#  name        :string           not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  user_id     :integer
#
# Indexes
#
#  index_documentation_modules_on_lower_name  (lower((name)::text)) UNIQUE
#
# Un "modulo" de documentacion: la tarjeta de Configuracion > Documentacion
# (p. ej. "Manuales de gastos") con su lista de archivos.
#
# Sin auditoria (RegisterAuditable) a proposito: no es un dato contable ni de
# negocio, y ese concern lee `User.current` en callbacks, que es justo la trampa
# que obliga a envolver cada escritura en `as_user`. El autor se guarda en
# `user_id` y lo pone el controller desde la sesion.
class DocumentationModule < ApplicationRecord
  belongs_to :user, optional: true
  # `dependent: :destroy` y no `:delete_all`: hay que instanciar cada archivo
  # para que CarrierWave borre el binario (after_commit del uploader). Con
  # delete_all quedarian huerfanos en S3.
  has_many :documentation_files, -> { order(:name) }, dependent: :destroy, inverse_of: :documentation_module

  NAME_MAX = 120

  before_validation { self.name = name.to_s.squish }

  validates :name, presence: { message: "El módulo necesita un nombre" }
  validates :name, length: { maximum: NAME_MAX, message: "El nombre no puede pasar de #{NAME_MAX} caracteres" }
  # Sin distinguir mayusculas; el indice LOWER(name) de la migracion es el que
  # manda cuando dos guardados llegan a la vez (el controller rescata ese caso).
  validates :name, uniqueness: { case_sensitive: false, message: "Ya existe un módulo con ese nombre" }

  scope :alfabetico, -> { order(Arel.sql("LOWER(documentation_modules.name) ASC")) }
end

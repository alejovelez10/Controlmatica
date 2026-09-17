# == Schema Information
#
# Table name: documentation_files
#
#  id                      :bigint           not null, primary key
#  byte_size               :bigint
#  content_type            :string
#  file                    :string           not null
#  name                    :string           not null
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  documentation_module_id :bigint           not null
#  user_id                 :integer
#
# Indexes
#
#  index_documentation_files_on_documentation_module_id  (documentation_module_id)
#
# Foreign Keys
#
#  fk_rails_...  (documentation_module_id => documentation_modules.id)
#
# Un archivo dentro de un modulo de documentacion.
#
# `name`, `content_type` y `byte_size` se copian del archivo subido ANTES de
# validar: la pantalla los muestra en cada fila y leerlos del almacenamiento
# significaria una llamada a S3 por archivo cada vez que se pinta la grilla.
class DocumentationFile < ApplicationRecord
  belongs_to :documentation_module, inverse_of: :documentation_files, touch: true
  belongs_to :user, optional: true

  mount_uploader :file, DocumentationFileUploader

  # Tipos que el navegador sabe pintar dentro del modal de vista previa. Todo lo
  # demas (Word, Excel, zip…) se descarga: el controller fuerza "attachment"
  # para cualquier otro tipo aunque se pida inline, asi un .txt no se abre como
  # pagina dentro de la aplicacion.
  PREVIEWABLE_TYPES = %w[application/pdf image/jpeg image/png image/webp].freeze

  before_validation :copiar_metadatos

  # Sin la condicion, un .exe rechazado sumaria DOS errores ("No se permiten
  # archivos exe" y "Debe adjuntar un archivo"): CarrierWave no cachea lo que
  # rechaza, asi que el archivo tambien queda vacio.
  validates :file, presence: { message: "Debe adjuntar un archivo" },
                   unless: -> { file_integrity_error || file_processing_error }
  validates :name, presence: { message: "El archivo necesita un nombre" }

  # El nombre ORIGINAL se captura aqui, al asignar, y no despues: una vez
  # cacheado, CarrierWave solo conoce el nombre saneado ("Guía de gastos.pdf"
  # pasa a "Guía_de_gastos.pdf"). `File.basename` porque algunos navegadores
  # viejos mandan la ruta completa del equipo.
  def file=(upload)
    if name.blank? && upload.respond_to?(:original_filename) && upload.original_filename.present?
      self.name = File.basename(upload.original_filename.to_s)
    end
    super
  end

  def previewable?
    PREVIEWABLE_TYPES.include?(content_type.to_s)
  end

  def extension
    File.extname(name.to_s).delete(".").downcase
  end

  private

  # Solo cuando llega un archivo NUEVO en esta instancia (`file.cached?`):
  # al renombrar o volver a guardar un registro viejo, los metadatos ya estan.
  def copiar_metadatos
    return unless file.present? && file.cached?

    subido = file.file
    self.name = subido.filename.to_s if name.blank?
    self.content_type = subido.content_type
    self.byte_size = subido.size
  end
end

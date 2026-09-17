# Archivos del modulo de Documentacion (manuales, formatos, politicas).
#
# Copia el patron de ReceiptUploader y no el de los uploaders publicos: los
# documentos internos (politicas, formatos con datos de la empresa) no deben
# quedar en una URL publica y permanente de S3. Con `fog_public = false` la URL
# se firma y caduca, y por eso la pantalla NUNCA usa `file.url`: ver y
# descargar pasan por DocumentationModulesController#download, que firma en el
# momento del clic y ademas exige sesion.
#
# Sin versiones ni MiniMagick: el archivo se guarda tal cual llego.
class DocumentationFileUploader < CarrierWave::Uploader::Base
  storage(Rails.env.production? ? :fog : :file)

  self.fog_public = false

  EXTENSIONS = %w[pdf doc docx xls xlsx ppt pptx csv txt jpg jpeg png webp zip].freeze

  # Los content-types que declaran los navegadores y los que detecta Marcel a
  # partir de los bytes NO siempre coinciden con el "oficial". Los casos
  # conocidos se listan a mano:
  #   * CSV: Excel en Windows lo sube como application/vnd.ms-excel y Marcel
  #     puede leerlo como text/plain.
  #   * ZIP: Windows declara application/x-zip-compressed.
  #   * Office moderno (docx/xlsx/pptx) es un zip por dentro; Marcel lo
  #     reconoce por la extension, pero si no la ve lo deja en application/zip.
  CONTENT_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/csv",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/zip",
    "application/x-zip-compressed",
    # Los .doc/.xls/.ppt viejos comparten contenedor OLE y a veces se detectan
    # con este tipo generico.
    "application/x-ole-storage",
    "application/CDFV2"
  ].freeze

  MAX_SIZE = 50.megabytes

  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end

  # Las DOS listas, como en ReceiptUploader: la extension la elige quien sube
  # (renombrar un .exe a .pdf cuesta un segundo) y el content-type sale de los
  # bytes. Cada una atrapa lo que la otra deja pasar.
  def extension_allowlist
    EXTENSIONS
  end

  def content_type_allowlist
    CONTENT_TYPES
  end

  # Minimo de 1 byte: un archivo vacio se sube sin error y parece un documento.
  def size_range
    1.byte..MAX_SIZE
  end
end

# Archivo que una persona mando por WhatsApp (paquete 17): foto o PDF de un
# comprobante, o una nota de voz.
#
# Privado como ReceiptUploader (`fog_public = false`): son facturas con NIT y
# valores. Meta solo guarda el archivo unos dias y su URL vence a los 5
# minutos; esta copia es la que despues se adjunta al gasto.
class WhatsappMediaUploader < CarrierWave::Uploader::Base
  storage(Rails.env.production? ? :fog : :file)

  self.fog_public = false

  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end

  # Lo que WhatsApp entrega para imagen, documento y audio que nos sirve. Las
  # notas de voz llegan como audio/ogg con Opus.
  def extension_allowlist
    %w[jpg jpeg png webp heic pdf ogg opus oga mp3 m4a aac amr]
  end

  def content_type_allowlist
    [%r{\Aimage/}, "application/pdf", %r{\Aaudio/}]
  end

  # 20 MB, el mismo tope del comprobante: lo que pase de ahi no se podria
  # adjuntar al gasto de todas formas.
  def size_range
    1.byte..20.megabytes
  end
end
